"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

// 1. LIGAÇÃO COM O COFRE (Banco de Dados)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();
  
  // 2. MEMÓRIA DA TELA (Guarda o que o usuário digita)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // 3. FUNÇÃO DE ENTRAR (O "Guarda" da porta)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Evita que a página pisque
    setLoading(true);

    // Bate na porta do Supabase e tenta entrar
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Acesso Negado: E-mail ou senha incorretos! ❌");
    } else {
      // Sucesso! Abre a porta do tatame
      router.push('/dashboard');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-6 font-sans text-white">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-red-600"></div>
        
        <div className="text-center mb-10 mt-4">
          <h1 className="text-4xl font-black uppercase tracking-tighter">
            RoxBJJ<span className="text-red-600">Planalto</span>
          </h1>
          <p className="text-zinc-500 text-xs mt-2 uppercase tracking-widest font-bold">Controle total da sua equipe.</p>
        </div>
        
        {/* Adicionamos o onSubmit no formulário para acionar a função */}
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-zinc-400 text-sm font-semibold mb-2">E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} // Salva o que foi digitado
              placeholder="admin@roxbjj.com" 
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-red-600 transition-all" 
            />
          </div>
          
          <div>
            <label className="block text-zinc-400 text-sm font-semibold mb-2">Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)} // Salva o que foi digitado
              placeholder="••••••••" 
              required
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:outline-none focus:border-red-600 transition-all" 
            />
          </div>
          
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold uppercase py-4 rounded-xl shadow-lg mt-4 transition-all"
          >
            {loading ? "Verificando..." : "Entrar no Tatame"}
          </button>
        </form>
      </div>
    </div>
  );
}