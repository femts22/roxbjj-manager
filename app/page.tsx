"use client";
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. LOGIN NO SUPABASE AUTH
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password 
      });

      if (authError) throw new Error("Erro no Login: " + authError.message);

      // 2. BUSCA NA TABELA ALUNOS
      const emailLimpo = email.trim().toLowerCase();
      const { data: perfil, error: dbError } = await supabase
        .from('alunos')
        .select('*')
        .eq('email', emailLimpo)
        .maybeSingle();

      if (dbError) throw new Error("Erro no Banco: " + dbError.message);

      // --- ÁREA DE DIAGNÓSTICO (O que o banco viu) ---
      if (!perfil) {
        alert("❌ ERRO DE CADASTRO:\n\nO login funcionou, mas não achei o e-mail [" + emailLimpo + "] na tabela ALUNOS.\n\nVerifique se o e-mail na tabela está escrito EXATAMENTE assim.");
        router.push('/aluno');
        return;
      }

      alert("✅ USUÁRIO ENCONTRADO!\nNome: " + perfil.nome + "\nRole no Banco: " + perfil.role);

      // 3. REDIRECIONAMENTO FORÇADO
      if (String(perfil.role).trim().toLowerCase() === 'admin') {
        router.push('/dashboard');
      } else {
        router.push('/aluno');
      }

    } catch (err: any) {
      alert("⚠️ ERRO CRÍTICO: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-900 p-10 rounded-[40px] border border-zinc-800">
        <h1 className="text-3xl font-black italic text-center mb-10">ROXBJJ<span className="text-red-600">PLANALTO</span></h1>
        <form onSubmit={handleAuth} className="space-y-4">
          <input type="email" placeholder="E-MAIL" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 font-bold" required />
          <input type="password" placeholder="SENHA" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-black border border-zinc-800 p-5 rounded-2xl outline-none focus:border-red-600 font-bold" required />
          <button disabled={loading} className="w-full bg-red-600 py-5 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all">
            {loading ? 'VERIFICANDO...' : 'ENTRAR NO TATAME'}
          </button>
        </form>
      </div>
    </div>
  );
}