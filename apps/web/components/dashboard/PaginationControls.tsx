"use client";

type PaginationControlsProps = {
  paginaAtual: number;
  totalItens: number;
  totalPaginas: number;
  onPaginaChange: (pagina: number | ((pagina: number) => number)) => void;
};

export function PaginationControls({
  paginaAtual,
  totalItens,
  totalPaginas,
  onPaginaChange,
}: PaginationControlsProps) {
  return (
    <footer className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
        {totalItens} atleta{totalItens === 1 ? "" : "s"} encontrado{totalItens === 1 ? "" : "s"}
      </p>
      <div className="flex items-center gap-2">
        <button disabled={paginaAtual === 1} onClick={() => onPaginaChange((pagina) => Math.max(1, pagina - 1))} className="bg-zinc-900 disabled:opacity-40 border border-zinc-800 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Anterior</button>
        <span className="text-[10px] text-zinc-500 font-black uppercase px-3">Página {paginaAtual} de {totalPaginas}</span>
        <button disabled={paginaAtual === totalPaginas} onClick={() => onPaginaChange((pagina) => Math.min(totalPaginas, pagina + 1))} className="bg-zinc-900 disabled:opacity-40 border border-zinc-800 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Próxima</button>
      </div>
    </footer>
  );
}
