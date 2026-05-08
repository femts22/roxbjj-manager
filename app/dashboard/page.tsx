"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const router = useRouter();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    if (isRegister) {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("Cadastro realizado! Entre agora.");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) alert("Erro: Verifique seus dados.");
      else {
        // LOGICA DE REDIRECIONAMENTO
        if (email === "SEU_EMAIL_AQUI@EXEMPLO.COM") { // <-- COLOQUE SEU EMAIL DE PROFESSOR AQUI
          router.push('/dashboard');
        } else {
          router.push('/aluno');
        }
      }
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-zinc-900 p-8 rounded-[40px] border border-zinc-800 shadow-2xl">
        <h2 className="text-3xl font-black italic text-center mb-8">ROXBJJ<span className="text-red-600">PLANALTO</span></h2>
        
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="Seu E-mail" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600" required />
          <input type="password" placeholder="Sua Senha" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl outline-none focus:border-red-600" required />
          
          <button className="w-full bg-red-600 py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-red-600/20 active:scale-95 transition-all">
            {isRegister ? 'Criar Conta' : 'Entrar no Tatame'}
          </button>
        </form>

        <button onClick={() => setIsRegister(!isRegister)} className="w-full mt-6 text-zinc-500 text-xs font-bold hover:text-white transition-all">
          {isRegister ? 'Já tenho conta? Entrar' : 'Não tem conta? Cadastre-se'}
        </button>
      </div>
    </div>
  );
}