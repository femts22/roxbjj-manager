"use client";

import type { FormEvent } from "react";
import type { Faixa } from "@/lib/types";

export type AlunoFormValues = {
  user_id: string;
  responsavel_user_id: string;
  nome: string;
  email: string;
  faixa: Faixa;
  grau: string;
  pago: boolean;
  vencimento: string;
  presencas: string;
};

type AlunoFormProps = {
  alunoEmEdicao: string | null;
  faixas: Faixa[];
  form: AlunoFormValues;
  salvando: boolean;
  onCancel: () => void;
  onChange: <K extends keyof AlunoFormValues>(campo: K, valor: AlunoFormValues[K]) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  canManage: boolean;
};

export function AlunoForm({
  alunoEmEdicao,
  faixas,
  form,
  salvando,
  onCancel,
  onChange,
  onSubmit,
  canManage,
}: AlunoFormProps) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-black uppercase italic">{alunoEmEdicao ? "Editar atleta" : "Cadastrar atleta"}</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Gestão completa de alunos</p>
        </div>
        {alunoEmEdicao && (
          <button type="button" onClick={onCancel} className="bg-zinc-800 hover:bg-zinc-700 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">
            Cancelar
          </button>
        )}
      </div>

      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-6">
        <input disabled={!canManage} required value={form.user_id} onChange={(event) => onChange("user_id", event.target.value)} className="md:col-span-3 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50" placeholder="User ID do usuário Auth do Supabase" />
        <input disabled={!canManage} value={form.responsavel_user_id} onChange={(event) => onChange("responsavel_user_id", event.target.value)} className="md:col-span-3 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50" placeholder="User ID do responsável (opcional)" />
        <input value={form.nome} onChange={(event) => onChange("nome", event.target.value)} className="md:col-span-2 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Nome" />
        <input type="email" value={form.email} onChange={(event) => onChange("email", event.target.value)} className="md:col-span-2 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="E-mail" />
        <select value={form.faixa} onChange={(event) => onChange("faixa", event.target.value as Faixa)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none">
          {faixas.map((faixa) => <option key={faixa} value={faixa}>Faixa {faixa}</option>)}
        </select>
        <select value={form.pago ? "sim" : "nao"} onChange={(event) => onChange("pago", event.target.value === "sim")} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none">
          <option value="nao">Pendente</option>
          <option value="sim">Pago</option>
        </select>
        <input type="number" min={0} max={4} value={form.grau} onChange={(event) => onChange("grau", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Grau" />
        <input type="number" min={1} max={31} value={form.vencimento} onChange={(event) => onChange("vencimento", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Vencimento" />
        <input type="number" min={0} value={form.presencas} onChange={(event) => onChange("presencas", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Presenças" />
        <button disabled={salvando || !canManage} className="md:col-span-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 p-3 px-5 rounded-2xl text-[10px] font-black uppercase transition-all">
          {salvando ? "Salvando..." : alunoEmEdicao ? "Salvar edição" : "Cadastrar aluno"}
        </button>
      </form>
    </section>
  );
}
