"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const router = useRouter();
  const [alunos, setAlunos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'alunos' | 'financeiro' | 'presenca'>('alunos');
  const [showModal, setShowModal] = useState(false);
  
  // Estados do Formulário
  const [idEditando, setIdEditando] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [faixa, setFaixa] = useState('Branca');
  const [vencimento, setVencimento] = useState('5');
  const [valor, setValor] = useState('150');

  const diaAtual = new Date().getDate();

  async function buscarAlunos() {
    setLoading(true);
    const { data, error } = await supabase.from('alunos').select('*').order('nome');
    if (!error) setAlunos(data || []);
    setLoading(false);
  }

  // AÇÃO: LOGOFF
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/');
  }

  // AÇÃO: CHECK-IN (PRESENÇA)
  async function fazerCheckIn(id: string, presencasAtuais: number) {
    const { error } = await supabase.from('alunos').update({ presencas: (presencasAtuais || 0) + 1 }).eq('id', id);
    if (!error) buscarAlunos();
  }

  // AÇÃO: FINANCEIRO
  async function alternarPagamento(id: string, statusAtual: boolean) {
    await supabase.from('alunos').update({ pago: !statusAtual }).eq('id', id);
    buscarAlunos();
  }

  async function salvarAluno(e: React.FormEvent) {
    e.preventDefault();
    const dados = { nome, faixa, vencimento: parseInt(vencimento), valor: parseFloat(valor), status: 'Ativo' };
    if (idEditando) { await supabase.from('alunos').update(dados).eq('id', idEditando); } 
    else { await supabase.from('alunos').insert([dados]); }
    limparFormulario(); buscarAlunos();
  }

  const limparFormulario = () => { setIdEditando(null); setNome(''); setShowModal(false); };

  useEffect(() => { buscarAlunos(); }, []);

  const totalEsperado = alunos.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalRecebido = alunos.filter(a => a.pago).reduce((acc, curr) => acc + (curr.valor || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-24 font-sans">
      {/* NAVBAR */}
      <nav className="p-4 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black italic leading-none">ROXBJJ<span className="text-red-600 font-black">PLANALTO</span></h2>
            <p className="text-[8px] text-zinc-500 font-bold tracking-[0.2em] uppercase">Management System</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowModal(true)} className="bg-white text-black px-4 py-2 rounded-full text-[10px] font-black uppercase hover:bg-red-600 hover:text-white transition-all">+ Aluno</button>
            <button onClick={handleLogout} className="bg-zinc-800 p-2 px-3 rounded-full text-[10px] font-black text-zinc-400 hover:text-white">SAIR</button>
          </div>
        </div>
      </nav>

      {/* SELETOR DE ABAS */}
      <div className="max-w-5xl mx-auto p-4 flex gap-2 overflow-x-auto no-scrollbar">
        {[
          { id: 'alunos', label: 'ATLETAS', icon: '🥋' },
          { id: 'financeiro', label: 'CAIXA', icon: '💰' },
          { id: 'presenca', label: 'CHAMADA', icon: '✋' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setAba(tab.id as any)}
            className={`flex-1 min-w-[100px] py-4 rounded-3xl font-black text-[10px] tracking-widest transition-all border ${aba === tab.id ? 'bg-red-600 border-red-500 shadow-lg shadow-red-600/20' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <main className="max-w-5xl mx-auto px-4 mt-2">
        {loading ? (
           <div className="text-center p-20 text-zinc-700 font-black animate-pulse uppercase tracking-[0.3em]">Carregando...</div>
        ) : (
          <>
            {/* ABA ATLETAS */}
            {aba === 'alunos' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {alunos.map(aluno => (
                  <div key={aluno.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-[32px] flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                      <div className={`w-1 h-8 rounded-full ${aluno.vencimento < diaAtual && !aluno.pago ? 'bg-red-600 animate-pulse' : 'bg-green-500'}`} />
                      <div>
                        <p className="font-bold text-zinc-200">{aluno.nome}</p>
                        <p className="text-[9px] text-zinc-500 font-black uppercase tracking-tighter">Faixa {aluno.faixa} • {aluno.presencas || 0} Treinos</p>
                      </div>
                    </div>
                    <button onClick={() => { setIdEditando(aluno.id); setNome(aluno.nome); setFaixa(aluno.faixa); setVencimento(aluno.vencimento?.toString()); setValor(aluno.valor?.toString()); setShowModal(true); }} className="p-2 opacity-0 group-hover:opacity-100 text-zinc-600 text-[10px] font-black">EDITAR</button>
                  </div>
                ))}
              </div>
            )}

            {/* ABA FINANCEIRA */}
            {aba === 'financeiro' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800">
                    <p className="text-zinc-500 text-[9px] font-black uppercase mb-1">Total Recebido</p>
                    <p className="text-2xl font-black text-green-500 italic">R$ {totalRecebido}</p>
                  </div>
                  <div className="bg-zinc-900 p-6 rounded-[32px] border border-zinc-800">
                    <p className="text-zinc-500 text-[9px] font-black uppercase mb-1">A Receber</p>
                    <p className="text-2xl font-black text-red-500 italic">R$ {totalEsperado - totalRecebido}</p>
                  </div>
                </div>
                <div className="bg-zinc-900 rounded-[40px] border border-zinc-800 overflow-hidden">
                  {alunos.map(aluno => (
                    <div key={aluno.id} className="p-5 border-b border-zinc-800 flex items-center justify-between">
                      <p className="font-bold text-xs">{aluno.nome}</p>
                      <button onClick={() => alternarPagamento(aluno.id, aluno.pago)} className={`px-5 py-2 rounded-full text-[9px] font-black ${aluno.pago ? 'bg-green-500 text-black' : 'bg-zinc-800 text-zinc-500'}`}>
                        {aluno.pago ? 'PAGO ✓' : 'PENDENTE'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ABA PRESENÇA */}
            {aba === 'presenca' && (
              <div className="bg-zinc-900 rounded-[40px] border border-zinc-800 overflow-hidden">
                <div className="p-6 bg-zinc-800/50 border-b border-zinc-700">
                  <p className="text-xs font-black uppercase tracking-widest text-red-500">Chamada do Dia</p>
                </div>
                {alunos.map(aluno => (
                  <div key={aluno.id} className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm">{aluno.nome}</p>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{aluno.presencas || 0} Aulas concluídas</p>
                    </div>
                    <button 
                      onClick={() => fazerCheckIn(aluno.id, aluno.presencas)}
                      className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all"
                    >
                      Check-in
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* MODAL EDITAR/NOVO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[40px] p-8">
            <h2 className="text-xl font-black mb-6 uppercase text-red-600 italic tracking-tighter">{idEditando ? 'Ajustar Atleta' : 'Nova Matrícula'}</h2>
            <form onSubmit={salvarAluno} className="space-y-4">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-[24px] outline-none font-bold" placeholder="Nome do Aluno" required />
              <div className="grid grid-cols-2 gap-3">
                <select value={faixa} onChange={(e) => setFaixa(e.target.value)} className="bg-zinc-950 border border-zinc-800 p-5 rounded-[24px] outline-none font-bold text-sm">
                  <option>Branca</option><option>Azul</option><option>Roxa</option><option>Marrom</option><option>Preta</option>
                </select>
                <input type="number" value={vencimento} onChange={(e) => setVencimento(e.target.value)} className="bg-zinc-950 border border-zinc-800 p-5 rounded-[24px] outline-none font-bold text-sm" placeholder="Dia" />
              </div>
              <input type="number" value={valor} onChange={(e) => setValor(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-5 rounded-[24px] outline-none font-bold text-sm" placeholder="Valor Mensalidade" />
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={limparFormulario} className="flex-1 bg-zinc-800 py-5 rounded-[24px] font-bold text-[10px]">CANCELAR</button>
                <button type="submit" className="flex-[2] bg-red-600 py-5 rounded-[24px] font-black uppercase text-[10px] tracking-widest">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}