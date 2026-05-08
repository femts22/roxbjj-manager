"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function DashboardAdmin() {
  const [alunos, setAlunos] = useState<any[]>([]);
  const [filtro, setFiltro] = useState<'todos' | 'pagos' | 'pendentes'>('todos');
  const router = useRouter();

  async function carregarAlunos() {
    const { data } = await supabase.from('alunos').select('*').order('nome');
    setAlunos(data || []);
  }

  useEffect(() => { carregarAlunos(); }, []);

  async function atualizarGrau(id: string, atual: number) {
    const novo = atual >= 4 ? 0 : atual + 1;
    await supabase.from('alunos').update({ grau: novo }).eq('id', id);
    carregarAlunos();
  }

  const diaAtual = new Date().getDate();
  const listaFiltrada = alunos.filter(a => {
    if (filtro === 'pagos') return a.pago;
    if (filtro === 'pendentes') return !a.pago && a.vencimento < diaAtual;
    return true;
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black italic uppercase">Mestre<span className="text-red-600">ROXBJJ</span></h2>
        <div className="flex gap-4">
          <select onChange={(e) => setFiltro(e.target.value as any)} className="bg-zinc-900 border border-zinc-800 p-2 px-4 rounded-full text-[10px] font-black outline-none">
            <option value="todos">TODOS ATLETAS</option>
            <option value="pagos">EM DIA</option>
            <option value="pendentes">INADIMPLENTES</option>
          </select>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="bg-red-600 p-2 px-6 rounded-full text-[10px] font-black uppercase">Sair</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-4">
        {listaFiltrada.map(aluno => (
          <div key={aluno.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="text-lg font-black">{aluno.nome}</span>
                <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${aluno.pago ? 'bg-green-500 text-black' : 'bg-red-600'}`}>
                  {aluno.pago ? 'PAGO' : 'PENDENTE'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Faixa {aluno.faixa} • {aluno.grau} Graus • Vence dia {aluno.vencimento}</p>
            </div>

            <div className="flex gap-2">
               <button onClick={() => atualizarGrau(aluno.id, aluno.grau)} className="bg-zinc-800 hover:bg-white hover:text-black p-3 px-5 rounded-2xl text-[9px] font-black transition-all">DAR GRAU</button>
               <button className="bg-zinc-800 hover:bg-zinc-700 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Gestão</button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}