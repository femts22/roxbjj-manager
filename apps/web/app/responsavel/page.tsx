"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { genericAuthError, getCurrentProfile, logClientError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export default function AreaResponsavel() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
      const profile = await getCurrentProfile();

      if (!ativo) return;

      if (!profile) {
        router.replace("/");
        return;
      }

      if (profile.role !== "responsavel") {
        router.replace(profile.role === "admin" || profile.role === "professor" ? "/dashboard" : "/aluno");
        return;
      }

      setCarregando(false);
    }

    void inicializar().catch((error: unknown) => {
      logClientError("Failed to load responsible area", error);
      if (ativo) {
        setErro(genericAuthError);
        setCarregando(false);
      }
    });

    return () => {
      ativo = false;
    };
  }, [router]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-black uppercase italic animate-pulse">
        A carregar area do responsavel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <main className="max-w-md mx-auto min-h-[calc(100vh-3rem)] flex flex-col justify-center gap-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            ROXBJJ <span className="text-red-600">PLANALTO</span>
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Area do responsavel
          </p>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-4">
          <h2 className="text-xl font-black uppercase italic">Acesso preparado</h2>
          <p className="text-sm leading-6 text-zinc-300">
            O perfil responsavel ja esta separado. O vinculo com alunos sera implementado na proxima fase.
          </p>

          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-2xl text-xs font-bold">
              {erro}
            </div>
          )}
        </section>

        <button
          onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
          className="bg-red-600 hover:bg-red-700 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest"
        >
          Sair
        </button>
      </main>
    </div>
  );
}
