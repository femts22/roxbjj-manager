"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { genericLoadError, genericSaveError, getCurrentProfile, getHomeRouteForRole, logClientError } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import type { Aluno } from '@/lib/types';

const alunoColumns = 'id,user_id,nome,email,faixa,grau,pago,vencimento,presencas';

export default function AreaAluno() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  const carregarDados = useCallback(async () => {
    const profile = await getCurrentProfile();
    if (!profile) return router.push('/');

    if (profile.role !== "aluno") {
      return router.replace(getHomeRouteForRole(profile.role));
    }

    const { data, error } = await supabase.from('alunos').select(alunoColumns).eq('user_id', profile.id).maybeSingle();
    if (error) {
      logClientError("Failed to load student area", error);
      setErro(genericLoadError);
      return;
    }

    if (data) setAluno(data);
  }, [router]);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  async function handleCheckIn() {
    if (!aluno) return;
    const { error } = await supabase.rpc('registrar_presenca');

    if (error) {
      logClientError("Failed to register attendance", error);
      setErro(genericSaveError);
      return;
    }

    alert("Check-in efetuado! Bom treino!");
    await carregarDados();
  }

  if (!aluno) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase italic animate-pulse">{erro ?? "A carregar tatame..."}</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-12">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex justify-between items-center py-4">
          <h2 className="text-xl font-black italic tracking-tighter">ROXBJJ <span className="text-red-600">PLANALTO</span></h2>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="bg-zinc-900 p-2 px-4 rounded-full text-[10px] font-black border border-zinc-800">SAIR</button>
        </header>

        {/* BOX GRADUAÇÃO */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[40px] p-8 shadow-2xl">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Graduação Atual</p>
          <div className="flex items-end justify-between mb-4">
            <h3 className="text-4xl font-black italic uppercase italic">Faixa {aluno.faixa}</h3>
            <span className="text-zinc-500 font-black text-xs italic">{aluno.presencas || 0} TREINOS</span>
          </div>
          
          <div className="flex gap-1 h-10 w-full bg-zinc-800 rounded-xl overflow-hidden border-2 border-black shadow-inner">
             <div className={`flex-1 ${aluno.faixa.toLowerCase() === 'branca' ? 'bg-zinc-200' : aluno.faixa.toLowerCase() === 'azul' ? 'bg-blue-600' : 'bg-purple-700'}`} />
             <div className="w-16 bg-black flex items-center justify-center gap-1 px-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-6 w-1.5 rounded-full ${i < (aluno.grau || 0) ? 'bg-white shadow-[0_0_8px_white]' : 'bg-zinc-800'}`} />
                ))}
             </div>
             <div className={`w-3 ${aluno.faixa.toLowerCase() === 'branca' ? 'bg-zinc-200' : aluno.faixa.toLowerCase() === 'azul' ? 'bg-blue-600' : 'bg-purple-700'}`} />
          </div>
        </div>

        {/* CHECK-IN */}
        <button onClick={handleCheckIn} className="w-full bg-red-600 py-8 rounded-[40px] flex flex-col items-center justify-center shadow-xl shadow-red-600/20 active:scale-95 transition-all">
          <span className="text-4xl mb-2">🥊</span>
          <span className="font-black uppercase italic tracking-widest">Confirmar Presença</span>
        </button>

        {/* FINANCEIRO */}
        <div className="bg-white text-black rounded-[40px] p-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vencimento</p>
              <p className="text-2xl font-black italic">DIA {aluno.vencimento}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-[10px] font-black ${aluno.pago ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {aluno.pago ? 'PAGO' : 'EM FALTA'}
            </div>
          </div>

          {erro && (
            <div className="mb-4 bg-red-50 text-red-600 border border-red-200 p-3 rounded-2xl text-xs font-bold">
              {erro}
            </div>
          )}

          {!aluno.pago ? (
            <div className="space-y-4">
              <div className="bg-zinc-100 p-6 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center">
                <div className="w-32 h-32 bg-zinc-300 rounded-xl mb-2 animate-pulse" />
                <p className="text-[9px] font-bold text-zinc-400 uppercase">QR CODE PIX</p>
              </div>
              <button className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase">Copiar Chave PIX</button>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-zinc-100">
               <p className="text-[10px] font-black text-zinc-400 uppercase mb-3">Alterações financeiras são feitas pela equipe administrativa.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
