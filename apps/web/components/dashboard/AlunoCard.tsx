"use client";

import type { Aluno } from "@/lib/types";

type AlunoCardProps = {
  aluno: Aluno;
  responsavelId?: string;
  onAtualizarGrau: (id: string, grauAtual: number) => void;
  onEditar?: (aluno: Aluno) => void;
  onExcluir?: (aluno: Aluno) => void;
};

export function AlunoCard({ aluno, responsavelId, onAtualizarGrau, onEditar, onExcluir }: AlunoCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-lg font-black">{aluno.nome}</span>
          <span className={`text-[8px] px-2 py-0.5 rounded-full font-black ${aluno.pago ? "bg-green-500 text-black" : "bg-red-600"}`}>
            {aluno.pago ? "PAGO" : "PENDENTE"}
          </span>
        </div>
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Faixa {aluno.faixa} • {aluno.grau} Graus • Vence dia {aluno.vencimento} • {aluno.presencas ?? 0} treinos</p>
        <p className="text-[10px] text-zinc-600 font-bold mt-1">{aluno.email}</p>
        {aluno.telefone && <p className="text-[10px] text-zinc-600 font-bold mt-1">{aluno.telefone}</p>}
        {responsavelId && (
          <p className="text-[9px] text-zinc-500 font-bold mt-2 uppercase tracking-widest">Responsável: {responsavelId}</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button onClick={() => onAtualizarGrau(aluno.id, aluno.grau)} className="bg-zinc-800 hover:bg-white hover:text-black p-3 px-5 rounded-2xl text-[9px] font-black transition-all">DAR GRAU</button>
        {onEditar && <button onClick={() => onEditar(aluno)} className="bg-zinc-800 hover:bg-zinc-700 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Editar</button>}
        {onExcluir && <button onClick={() => onExcluir(aluno)} className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Excluir</button>}
      </div>
    </div>
  );
}
