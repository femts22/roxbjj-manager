"use client";

import { useEffect, useMemo, useState } from "react";
import { genericSaveError, logClientError } from "@/lib/auth";
import {
  calcularResumoCobranca,
  diaPagamentoAluno,
  formatarData,
  formatarValor,
  hojeISO,
  pagamentoStatusOptions,
  textoStatusFinanceiro,
  totalizarValores,
  type StatusFinanceiroCalculado,
} from "@/lib/financeiro";
import { supabase } from "@/lib/supabase";
import type { Aluno, Pagamento, PagamentoStatus } from "@/lib/types";

type FinanceiroAdminProps = {
  alunos: Aluno[];
  pagamentos: Pagamento[];
  canManage: boolean;
  onReload: () => Promise<void>;
  onMessage: (mensagem: { tipo: "sucesso" | "erro"; texto: string }) => void;
};

type StatusFiltro = "todos" | PagamentoStatus | "vencido_calculado" | "inadimplente_calculado";

type CobrancaForm = {
  aluno_id: string;
  valor: string;
  data_vencimento: string;
  status: PagamentoStatus;
  observacoes: string;
};

type CobrancaEdicao = {
  valor: string;
  data_vencimento: string;
  status: PagamentoStatus;
  observacoes: string;
};

const formInicial: CobrancaForm = {
  aluno_id: "",
  valor: "",
  data_vencimento: hojeISO(),
  status: "aberto",
  observacoes: "",
};

const statusClass: Record<StatusFinanceiroCalculado, string> = {
  pago: "bg-green-500 text-black",
  aberto: "bg-zinc-800 text-zinc-300",
  vence_hoje: "bg-yellow-400 text-black",
  vencido: "bg-red-600 text-white",
  inadimplente: "bg-red-900 text-red-100",
  cancelado: "bg-zinc-800 text-zinc-400",
};

function valorParaNumero(valor: string) {
  const normalizado = valor.replace(",", ".").trim();
  if (!normalizado) return null;
  const numero = Number(normalizado);
  return Number.isFinite(numero) ? numero : NaN;
}

export function FinanceiroAdmin({ alunos, pagamentos, canManage, onReload, onMessage }: FinanceiroAdminProps) {
  const [form, setForm] = useState<CobrancaForm>(formInicial);
  const [filtroStatus, setFiltroStatus] = useState<StatusFiltro>("todos");
  const [edicoes, setEdicoes] = useState<Record<string, CobrancaEdicao>>({});
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const alunosPorId = useMemo(() => new Map(alunos.map((aluno) => [aluno.id, aluno])), [alunos]);

  useEffect(() => {
    setEdicoes(
      pagamentos.reduce<Record<string, CobrancaEdicao>>((mapa, pagamento) => {
        mapa[pagamento.id] = {
          valor: pagamento.valor == null ? "" : String(pagamento.valor),
          data_vencimento: pagamento.data_vencimento,
          status: pagamento.status,
          observacoes: pagamento.observacoes ?? "",
        };
        return mapa;
      }, {}),
    );
  }, [pagamentos]);

  const cobrancas = useMemo(() => {
    const registradas = pagamentos
      .map((pagamento) => {
        const aluno = alunosPorId.get(pagamento.aluno_id);
        if (!aluno) return null;
        return calcularResumoCobranca(aluno, pagamento);
      })
      .filter((resumo): resumo is NonNullable<typeof resumo> => Boolean(resumo));

    const alunosSemCobranca = alunos
      .filter((aluno) => !pagamentos.some((pagamento) => pagamento.aluno_id === aluno.id))
      .map((aluno) => calcularResumoCobranca(aluno));

    return [...registradas, ...alunosSemCobranca].sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento));
  }, [alunos, alunosPorId, pagamentos]);

  const cobrancasFiltradas = useMemo(() => {
    if (filtroStatus === "todos") return cobrancas;
    if (filtroStatus === "vencido_calculado") return cobrancas.filter((cobranca) => cobranca.status === "vencido");
    if (filtroStatus === "inadimplente_calculado") return cobrancas.filter((cobranca) => cobranca.status === "inadimplente");
    return cobrancas.filter((cobranca) => cobranca.pagamento?.status === filtroStatus || cobranca.status === filtroStatus);
  }, [cobrancas, filtroStatus]);

  const totais = useMemo(() => totalizarValores(cobrancas), [cobrancas]);
  const alunosInadimplentes = useMemo(() => new Set(cobrancas.filter((cobranca) => cobranca.status === "inadimplente").map((cobranca) => cobranca.aluno.id)).size, [cobrancas]);

  function atualizarForm<K extends keyof CobrancaForm>(campo: K, valor: CobrancaForm[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function atualizarEdicao(id: string, campo: keyof CobrancaEdicao, valor: string) {
    setEdicoes((atual) => ({
      ...atual,
      [id]: {
        ...atual[id],
        [campo]: valor,
      },
    }));
  }

  async function sincronizarAlunoPago(alunoId: string, pago: boolean) {
    const { error } = await supabase.from("alunos").update({ pago }).eq("id", alunoId);
    if (error) logClientError("Failed to sync aluno payment flag", error);
  }

  async function criarCobranca(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      onMessage({ tipo: "erro", texto: "Apenas administradores podem criar cobranças." });
      return;
    }

    const valor = valorParaNumero(form.valor);
    if (!form.aluno_id) return onMessage({ tipo: "erro", texto: "Selecione um aluno." });
    if (!form.data_vencimento) return onMessage({ tipo: "erro", texto: "Informe o vencimento." });
    if (Number.isNaN(valor)) return onMessage({ tipo: "erro", texto: "Informe um valor válido." });

    const { error } = await supabase.from("pagamentos").insert({
      aluno_id: form.aluno_id,
      valor,
      data_vencimento: form.data_vencimento,
      data_pagamento: form.status === "pago" ? hojeISO() : null,
      status: form.status,
      observacoes: form.observacoes.trim() || null,
    });

    if (error) {
      logClientError("Failed to create payment charge", error);
      onMessage({ tipo: "erro", texto: genericSaveError });
      return;
    }

    await sincronizarAlunoPago(form.aluno_id, form.status === "pago");
    setForm(formInicial);
    onMessage({ tipo: "sucesso", texto: "Cobrança criada com sucesso." });
    await onReload();
  }

  async function salvarEdicao(pagamento: Pagamento) {
    if (!canManage) {
      onMessage({ tipo: "erro", texto: "Apenas administradores podem editar cobranças." });
      return;
    }

    const edicao = edicoes[pagamento.id];
    if (!edicao) return;

    const valor = valorParaNumero(edicao.valor);
    if (!edicao.data_vencimento) return onMessage({ tipo: "erro", texto: "Informe o vencimento." });
    if (Number.isNaN(valor)) return onMessage({ tipo: "erro", texto: "Informe um valor válido." });

    setProcessandoId(pagamento.id);
    const { error } = await supabase
      .from("pagamentos")
      .update({
        valor,
        data_vencimento: edicao.data_vencimento,
        data_pagamento: edicao.status === "pago" ? pagamento.data_pagamento ?? hojeISO() : null,
        status: edicao.status,
        observacoes: edicao.observacoes.trim() || null,
      })
      .eq("id", pagamento.id);

    if (error) {
      logClientError("Failed to update payment charge", error);
      onMessage({ tipo: "erro", texto: genericSaveError });
      setProcessandoId(null);
      return;
    }

    await sincronizarAlunoPago(pagamento.aluno_id, edicao.status === "pago");
    onMessage({ tipo: "sucesso", texto: "Cobrança atualizada." });
    await onReload();
    setProcessandoId(null);
  }

  async function alterarStatus(pagamento: Pagamento, status: PagamentoStatus) {
    if (!canManage) {
      onMessage({ tipo: "erro", texto: "Apenas administradores podem alterar cobranças." });
      return;
    }

    setProcessandoId(pagamento.id);
    const { error } = await supabase
      .from("pagamentos")
      .update({
        status,
        data_pagamento: status === "pago" ? pagamento.data_pagamento ?? hojeISO() : null,
      })
      .eq("id", pagamento.id);

    if (error) {
      logClientError("Failed to change payment status", error);
      onMessage({ tipo: "erro", texto: genericSaveError });
      setProcessandoId(null);
      return;
    }

    await sincronizarAlunoPago(pagamento.aluno_id, status === "pago");
    onMessage({ tipo: "sucesso", texto: status === "pago" ? "Cobrança marcada como paga." : status === "cancelado" ? "Cobrança cancelada." : "Cobrança atualizada." });
    await onReload();
    setProcessandoId(null);
  }

  return (
    <section className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-5">
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Recebido no mês</p>
          <p className="mt-1 text-xl font-black text-green-400">{formatarValor(totais.recebidoMes)}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Em aberto</p>
          <p className="mt-1 text-xl font-black text-zinc-100">{formatarValor(totais.aberto)}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Vencido</p>
          <p className="mt-1 text-xl font-black text-red-400">{formatarValor(totais.vencido)}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Inadimplente</p>
          <p className="mt-1 text-xl font-black text-red-300">{formatarValor(totais.inadimplente)}</p>
        </div>
        <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Alunos inadimplentes</p>
          <p className="mt-1 text-xl font-black text-red-300">{alunosInadimplentes}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
        <div className="mb-5">
          <h3 className="text-lg font-black uppercase italic">Criar cobrança</h3>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Mensalidade manual sem integração de pagamento</p>
        </div>
        <form onSubmit={criarCobranca} className="grid gap-3 lg:grid-cols-6">
          <select disabled={!canManage} value={form.aluno_id} onChange={(event) => atualizarForm("aluno_id", event.target.value)} className="lg:col-span-2 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50">
            <option value="">Selecione o aluno</option>
            {alunos.map((aluno) => <option key={aluno.id} value={aluno.id}>{aluno.nome}</option>)}
          </select>
          <input disabled={!canManage} value={form.valor} onChange={(event) => atualizarForm("valor", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50" placeholder="Valor" />
          <input disabled={!canManage} type="date" value={form.data_vencimento} onChange={(event) => atualizarForm("data_vencimento", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50" aria-label="Vencimento" />
          <select disabled={!canManage} value={form.status} onChange={(event) => atualizarForm("status", event.target.value as PagamentoStatus)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50">
            {pagamentoStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <button disabled={!canManage} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 p-3 px-5 rounded-2xl text-[10px] font-black uppercase transition-all">Criar</button>
          <textarea disabled={!canManage} value={form.observacoes} onChange={(event) => atualizarForm("observacoes", event.target.value)} className="lg:col-span-6 min-h-16 resize-none bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none disabled:opacity-50" placeholder="Observações" />
        </form>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-black uppercase italic">Cobranças</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Listagem e edição de mensalidades</p>
          </div>
          <select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value as StatusFiltro)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-[10px] font-black uppercase outline-none">
            <option value="todos">Todos status</option>
            <option value="aberto">Aberto</option>
            <option value="pago">Pago</option>
            <option value="cancelado">Cancelado</option>
            <option value="vencido_calculado">Vencidos</option>
            <option value="inadimplente_calculado">Inadimplentes</option>
          </select>
        </div>

        <div className="grid gap-3">
          {cobrancasFiltradas.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhuma cobrança encontrada</div>
          ) : cobrancasFiltradas.map((cobranca) => {
            const pagamento = cobranca.pagamento;
            const edicao = pagamento ? edicoes[pagamento.id] : null;
            const atualizando = pagamento ? processandoId === pagamento.id : false;

            return (
              <article key={pagamento?.id ?? `sem-cobranca-${cobranca.aluno.id}`} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl grid gap-4 xl:grid-cols-[1.2fr_1fr_1.4fr_auto] xl:items-center">
                <div>
                  <h4 className="font-black uppercase">{cobranca.aluno.nome}</h4>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dia base: {diaPagamentoAluno(cobranca.aluno)}</p>
                  <span className={`mt-3 inline-flex w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase ${statusClass[cobranca.status]}`}>
                    {textoStatusFinanceiro(cobranca.status, cobranca.diasEmAtraso)}
                  </span>
                </div>

                <div className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  <span>Vencimento: {formatarData(cobranca.dataVencimento)}</span>
                  <span>Valor: {formatarValor(cobranca.valor)}</span>
                  <span>Dias em atraso: {cobranca.diasEmAtraso}</span>
                </div>

                {pagamento && edicao ? (
                  <div className="grid gap-2 md:grid-cols-2">
                    <input disabled={!canManage || atualizando} value={edicao.valor} onChange={(event) => atualizarEdicao(pagamento.id, "valor", event.target.value)} className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-xs outline-none disabled:opacity-50" placeholder="Valor" />
                    <input disabled={!canManage || atualizando} type="date" value={edicao.data_vencimento} onChange={(event) => atualizarEdicao(pagamento.id, "data_vencimento", event.target.value)} className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-xs outline-none disabled:opacity-50" aria-label="Vencimento" />
                    <select disabled={!canManage || atualizando} value={edicao.status} onChange={(event) => atualizarEdicao(pagamento.id, "status", event.target.value)} className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-xs outline-none disabled:opacity-50">
                      {pagamentoStatusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <input disabled={!canManage || atualizando} value={edicao.observacoes} onChange={(event) => atualizarEdicao(pagamento.id, "observacoes", event.target.value)} className="bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-xs outline-none disabled:opacity-50" placeholder="Observação" />
                  </div>
                ) : (
                  <div className="text-xs font-bold text-zinc-500">Sem cobrança registrada para este aluno no momento.</div>
                )}

                <div className="flex flex-wrap gap-2 xl:justify-end">
                  {pagamento ? (
                    <>
                      <button onClick={() => alterarStatus(pagamento, "pago")} disabled={!canManage || atualizando || cobranca.status === "pago"} className="bg-green-500 text-black disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Pago</button>
                      <button onClick={() => alterarStatus(pagamento, "aberto")} disabled={!canManage || atualizando || pagamento.status === "aberto"} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Aberto</button>
                      <button onClick={() => alterarStatus(pagamento, "cancelado")} disabled={!canManage || atualizando || pagamento.status === "cancelado"} className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Cancelar</button>
                      <button onClick={() => salvarEdicao(pagamento)} disabled={!canManage || atualizando} className="bg-white text-black hover:bg-zinc-200 disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Salvar</button>
                    </>
                  ) : (
                    <button onClick={() => setForm({ aluno_id: cobranca.aluno.id, valor: "", data_vencimento: cobranca.dataVencimento, status: "aberto", observacoes: "" })} disabled={!canManage} className="bg-white text-black hover:bg-zinc-200 disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Criar cobrança</button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
