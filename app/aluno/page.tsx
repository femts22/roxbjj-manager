"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AreaAluno() {
  const [aluno, setAluno] = useState<any>(null);
  const [novoVencimento, setNovoVencimento] = useState('');
  const router = useRouter();

  async function carregarDados() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/');

    const { data } = await supabase.from('alunos').select('*').eq('email', user.email).single();
    if (data) setAluno(data);
  }

  useEffect(() => { carregarDados(); }, []);

  async function handleCheckIn() {
    await supabase.from('alunos').update({ presencas: (aluno.presencas || 0) + 1 }).eq('id', aluno.id);
    alert("Check-in efetuado! Bom treino!");
    carregarDados();
  }

  async function mudarVencimento() {
    if (!aluno.pago) return alert("Tens mensalidades pendentes. Regulariza primeiro.");
    await supabase.from('alunos').update({ vencimento: parseInt(novoVencimento) }).eq('id', aluno.id);
    alert("Data de vencimento alterada para o próximo mês!");
    carregarDados();
  }

  if (!aluno) return <div className="min-h-screen bg-black text-white flex items-center justify-center font-black uppercase italic animate-pulse">A carregar tatame...</div>;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-12">
      <div className="max-w-md mx-auto space-y-6">
        <header className="flex justify-between items-center py-4">
          <h2 className="text-xl font-black italic tracking-tighter">ROXBJJ<span className="text-red-600">ALUNO</span></h2>
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
               <p className="text-[10px] font-black text-zinc-400 uppercase mb-3">Mudar data para o próximo mês</p>
               <div className="flex gap-2">
                 <input type="number" value={novoVencimento} onChange={e => setNovoVencimento(e.target.value)} className="flex-1 bg-zinc-100 p-4 rounded-xl outline-none font-bold text-sm" placeholder="Ex: 15" />
                 <button onClick={mudarVencimento} className="bg-black text-white px-6 rounded-xl font-black text-[10px]">ALTERAR</button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}