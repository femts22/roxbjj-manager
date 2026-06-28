"use client";

import type { Faixa } from "@/lib/types";

export type FiltroPagamento = "todos" | "pagos" | "pendentes";

type AlunosFiltersProps = {
  faixas: Faixa[];
  filtroFaixa: Faixa | "todas";
  filtroPagamento: FiltroPagamento;
  pesquisa: string;
  onFiltroFaixaChange: (filtro: Faixa | "todas") => void;
  onFiltroPagamentoChange: (filtro: FiltroPagamento) => void;
  onPesquisaChange: (pesquisa: string) => void;
};

export function AlunosFilters({
  faixas,
  filtroFaixa,
  filtroPagamento,
  pesquisa,
  onFiltroFaixaChange,
  onFiltroPagamentoChange,
  onPesquisaChange,
}: AlunosFiltersProps) {
  return (
    <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
      <div className="grid gap-3 md:grid-cols-4">
        <input value={pesquisa} onChange={(event) => onPesquisaChange(event.target.value)} className="md:col-span-2 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Pesquisar por nome ou e-mail" />
        <select value={filtroPagamento} onChange={(event) => onFiltroPagamentoChange(event.target.value as FiltroPagamento)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-[10px] font-black outline-none uppercase">
          <option value="todos">Todos atletas</option>
          <option value="pagos">Em dia</option>
          <option value="pendentes">Inadimplentes</option>
        </select>
        <select value={filtroFaixa} onChange={(event) => onFiltroFaixaChange(event.target.value as Faixa | "todas")} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-[10px] font-black outline-none uppercase">
          <option value="todas">Todas faixas</option>
          {faixas.map((faixa) => <option key={faixa} value={faixa}>Faixa {faixa}</option>)}
        </select>
      </div>
    </section>
  );
}
