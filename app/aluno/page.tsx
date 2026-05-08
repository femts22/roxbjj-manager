"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function AreaAluno() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/');
      else setUser(data.user);
    });
  }, []);

  async function checkIn() {
    // Aqui poderiamos buscar o registro dele na tabela 'alunos' pelo email e somar +1
    alert("Check-in realizado! Bom treino, guerreiro!");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="flex justify-between items-center mb-10">
        <h2 className="text-xl font-black italic">ROXBJJ<span className="text-red-600">ALUNO</span></h2>
        <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="text-[10px] font-black text-zinc-500 border border-zinc-800 px-4 py-2 rounded-full">SAIR</button>
      </header>

      <main className="max-w-md mx-auto space-y-6">
        <div className="bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 text-center">
          <p className="text-zinc-500 text-xs font-black uppercase mb-2 tracking-widest">Seja bem-vindo</p>
          <p className="text-2xl font-black">{user?.email?.split('@')[0]}</p>
        </div>

        {/* BOTÃO DE CHECK-IN GIGANTE */}
        <button onClick={checkIn} className="w-full bg-red-600 py-10 rounded-[40px] flex flex-col items-center justify-center shadow-2xl shadow-red-600/20 active:scale-95 transition-all">
          <span className="text-4xl mb-2">✋</span>
          <span className="text-xl font-black uppercase tracking-tighter italic">Fazer Check-in</span>
        </button>

        {/* ÁREA DE PAGAMENTO */}
        <div className="bg-white p-8 rounded-[40px] text-center text-black">
          <p className="text-[10px] font-black uppercase mb-4 text-zinc-400">Mensalidade / PIX</p>
          <div className="w-48 h-48 bg-zinc-200 mx-auto mb-4 rounded-2xl flex items-center justify-center border-2 border-dashed border-zinc-300">
             <p className="text-[10px] font-bold">QR CODE AQUI</p>
          </div>
          <p className="text-sm font-black tracking-tight">R$ 150,00 / Mês</p>
          <button className="mt-4 bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase w-full">Copiar Código PIX</button>
        </div>
      </main>
    </div>
  );
}