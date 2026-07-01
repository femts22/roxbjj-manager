"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { genericAuthError, getCurrentProfile, getHomeRouteForRole, logClientError } from '@/lib/auth';
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const profile = await getCurrentProfile();

      if (!profile) {
        await supabase.auth.signOut();
        throw new Error("Profile not found");
      }

      router.push(getHomeRouteForRole(profile.role));
      router.refresh();
    } catch (err: unknown) {
      logClientError("Login failed", err);
      setError(genericAuthError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-gray-200 shadow-xl">
        
        {/* Cabeçalho / Logo - AGORA VERMELHO */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">
            ROXBJJ <span className="text-red-600">PLANALTO</span>
          </h1>
          <p className="mt-2 text-gray-500 text-sm font-medium uppercase tracking-widest">
            Acesse o tatame digital
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4">
            {/* Campo Email */}
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                placeholder="Seu e-mail"
              />
            </div>

            {/* Campo Senha */}
            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                placeholder="Sua senha"
              />
            </div>
          </div>

          {/* Mensagem de Erro */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg animate-shake">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Botão de Entrar - AGORA VERMELHO */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              "ENTRAR NO SISTEMA"
            )}
          </button>
        </form>

        <div className="space-y-3 text-center">
          <Link href="/cadastro" className="block text-sm font-black uppercase tracking-widest text-red-600 hover:text-red-700">
            Ainda não treina conosco? Sou aluno novo, quero me cadastrar
          </Link>
          <Link href="/" className="block text-xs font-bold text-gray-500 hover:text-gray-900">
            Já tenho cadastro, quero entrar
          </Link>
        </div>

        <div className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
          ROXBJJ PLANALTO © 2026 - Gestão de Elite
        </div>
      </div>
    </div>
  );
}
