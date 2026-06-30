"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { genericAuthError, genericLoadError, getCurrentProfile, getHomeRouteForRole, logClientError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Aluno } from "@/lib/types";

const alunoColumns = "id,user_id,nome,email,faixa,grau,pago,vencimento,presencas";

export default function AreaResponsavel() {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const router = useRouter();

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const profile = await getCurrentProfile();

    if (!profile) {
      router.replace("/");
      return;
    }

    if (profile.role !== "responsavel") {
      router.replace(getHomeRouteForRole(profile.role));
      return;
    }

    const { data: vinculos, error: vinculosError } = await supabase
      .from("responsavel_alunos")
      .select("aluno_id")
      .eq("responsavel_id", profile.id);

    if (vinculosError) {
      logClientError("Failed to load responsible links", vinculosError);
      setErro(genericLoadError);
      setAlunos([]);
      setCarregando(false);
      return;
    }

    const alunoIds = (vinculos ?? []).map((vinculo) => vinculo.aluno_id);

    if (alunoIds.length === 0) {
      setAlunos([]);
      setCarregando(false);
      return;
    }

    const { data, error } = await supabase
      .from("alunos")
      .select(alunoColumns)
      .in("id", alunoIds)
      .order("nome", { ascending: true });

    if (error) {
      logClientError("Failed to load responsible students", error);
      setErro(genericLoadError);
      setAlunos([]);
    } else {
      setAlunos(data ?? []);
    }

    setCarregando(false);
  }, [router]);

  useEffect(() => {
    void carregarDados().catch((error: unknown) => {
      logClientError("Failed to load responsible area", error);
      setErro(genericAuthError);
      setCarregando(false);
    });
  }, [carregarDados]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-black uppercase italic animate-pulse">
        A carregar area do responsavel...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 pb-12">
      <main className="max-w-4xl mx-auto grid gap-6">
        <header className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-black italic tracking-tighter uppercase">
              ROXBJJ <span className="text-red-600">PLANALTO</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Area do responsavel
            </p>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => router.push("/"))}
            className="bg-red-600 hover:bg-red-700 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest"
          >
            Sair
          </button>
        </header>

        <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6">
          <h1 className="text-3xl font-black italic tracking-tighter uppercase">
            {alunos.length}
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {alunos.length === 1 ? "Atleta vinculado" : "Atletas vinculados"}
          </p>
        </section>

        {erro && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl text-sm font-bold">
            {erro}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-2">
          {alunos.length === 0 ? (
            <div className="md:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 text-center">
              <h2 className="text-xl font-black uppercase italic">Nenhum atleta vinculado</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Procure a equipe administrativa para vincular este acesso a um aluno.
              </p>
            </div>
          ) : alunos.map((aluno) => (
            <article key={aluno.id} className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black uppercase italic">{aluno.nome}</h2>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{aluno.email}</p>
                </div>
                <span className={`shrink-0 rounded-full px-3 py-1 text-[9px] font-black ${aluno.pago ? "bg-green-500 text-black" : "bg-red-600 text-white"}`}>
                  {aluno.pago ? "PAGO" : "PENDENTE"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Faixa</p>
                  <p className="mt-2 text-sm font-black uppercase">{aluno.faixa}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Grau</p>
                  <p className="mt-2 text-sm font-black">{aluno.grau}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Treinos</p>
                  <p className="mt-2 text-sm font-black">{aluno.presencas ?? 0}</p>
                </div>
              </div>

              <div className="bg-white text-black rounded-[28px] p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Mensalidade</p>
                  <p className="mt-1 text-2xl font-black italic">Dia {aluno.vencimento}</p>
                </div>
                <span className={`rounded-full px-3 py-2 text-[9px] font-black ${aluno.pago ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {aluno.pago ? "Em dia" : "Verificar"}
                </span>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
