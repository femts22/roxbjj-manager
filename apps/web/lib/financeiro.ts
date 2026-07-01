import type { Aluno, Pagamento, PagamentoStatus } from "./types";

export type StatusFinanceiroCalculado = "pago" | "aberto" | "vence_hoje" | "vencido" | "inadimplente" | "cancelado";

export type ResumoCobranca = {
  aluno: Aluno;
  pagamento?: Pagamento;
  dataVencimento: string;
  diasEmAtraso: number;
  status: StatusFinanceiroCalculado;
  valor: number;
};

export const INADIMPLENCIA_DIAS = 1;

export const financeiroStatusLabel: Record<StatusFinanceiroCalculado, string> = {
  pago: "Pago",
  aberto: "Em aberto",
  vence_hoje: "Vence hoje",
  vencido: "Vencido",
  inadimplente: "Inadimplente",
  cancelado: "Cancelado",
};

export const pagamentoStatusOptions: PagamentoStatus[] = ["aberto", "pago", "vencido", "cancelado"];

export function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

export function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

export function formatarValor(valor?: number | null) {
  if (valor == null) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

export function diaPagamentoAluno(aluno: Aluno) {
  return aluno.dia_vencimento_pagamento ?? aluno.vencimento;
}

export function dataVencimentoAtual(dia: number) {
  const hoje = new Date();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaSeguro = Math.min(Math.max(dia, 1), ultimoDiaMes);
  return new Date(hoje.getFullYear(), hoje.getMonth(), diaSeguro).toISOString().slice(0, 10);
}

export function diferencaDias(data: string) {
  const hoje = new Date();
  const vencimento = new Date(`${data.slice(0, 10)}T00:00:00`);
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000);
}

export function calcularResumoCobranca(aluno: Aluno, pagamento?: Pagamento): ResumoCobranca {
  const dataVencimento = pagamento?.data_vencimento ?? dataVencimentoAtual(diaPagamentoAluno(aluno));
  const valor = Number(pagamento?.valor ?? 0);

  if (pagamento?.status === "cancelado") {
    return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "cancelado", valor };
  }

  if (pagamento?.status === "pago" || pagamento?.data_pagamento || (!pagamento && aluno.pago)) {
    return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "pago", valor };
  }

  const diasParaVencer = diferencaDias(dataVencimento);
  const diasEmAtraso = Math.max(0, -diasParaVencer);

  if (diasEmAtraso > INADIMPLENCIA_DIAS) return { aluno, pagamento, dataVencimento, diasEmAtraso, status: "inadimplente", valor };
  if (diasEmAtraso > 0 || pagamento?.status === "vencido") return { aluno, pagamento, dataVencimento, diasEmAtraso, status: "vencido", valor };
  if (diasParaVencer === 0) return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "vence_hoje", valor };
  return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "aberto", valor };
}

export function textoStatusFinanceiro(status: StatusFinanceiroCalculado, diasEmAtraso: number) {
  if (status === "vencido") return `Atrasado há ${diasEmAtraso} ${diasEmAtraso === 1 ? "dia" : "dias"}`;
  if (status === "inadimplente") return `Inadimplente há ${diasEmAtraso} dias`;
  return financeiroStatusLabel[status];
}

export function pagamentoEstaPago(pagamento: Pagamento) {
  return pagamento.status === "pago" || Boolean(pagamento.data_pagamento);
}

export function totalizarValores(resumos: ResumoCobranca[]) {
  return resumos.reduce(
    (totais, resumo) => {
      if (resumo.status === "pago" && resumo.pagamento?.data_pagamento?.slice(0, 7) === hojeISO().slice(0, 7)) {
        totais.recebidoMes += resumo.valor;
      }
      if (resumo.status === "aberto" || resumo.status === "vence_hoje") totais.aberto += resumo.valor;
      if (resumo.status === "vencido") totais.vencido += resumo.valor;
      if (resumo.status === "inadimplente") totais.inadimplente += resumo.valor;
      return totais;
    },
    { recebidoMes: 0, aberto: 0, vencido: 0, inadimplente: 0 },
  );
}
