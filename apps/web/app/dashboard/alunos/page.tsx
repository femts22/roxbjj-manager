"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { canAccessDashboard, genericLoadError, genericSaveError, getCurrentProfile, getHomeRouteForRole, logClientError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Aluno, AlunoEvento, AlunoObservacao, AlunoObservacaoTipo, AlunoObservacaoVisibilidade, AppRole, GraduacaoHistorico, GraduacaoSolicitacao, Pagamento, Profile, ResponsavelAluno } from "@/lib/types";

type FichaTab = "dados" | "graduacao" | "financeiro" | "responsaveis" | "historico";
type StatusFinanceiro = "pago" | "aberto" | "vence_hoje" | "atrasado" | "inadimplente" | "cancelado";
type EventoHistorico = {
  data?: string | null;
  titulo: string;
  detalhe: string;
};

const alunoColumns = "id,user_id,nome,email,categoria,faixa,grau,graus,graduacao_aprovada,pago,vencimento,dia_vencimento_pagamento,presencas,telefone,data_nascimento,observacoes,nome_social,cpf,rg,whatsapp,cep,rua,numero,complemento,bairro,cidade,estado,contato_emergencia_nome,contato_emergencia_telefone,contato_emergencia_parentesco,tipo_sanguineo,alergias,restricoes_medicas,medicamentos_uso_continuo,observacoes_medicas,responsavel_principal_nome,responsavel_principal_telefone,responsavel_principal_whatsapp,responsavel_principal_email,responsavel_principal_parentesco,cadastro_completo,cadastro_atualizado_em,created_at,updated_at";
const graduacaoHistoricoColumns = "id,aluno_id,solicitacao_id,categoria,faixa,graus,data_graduacao,origem,aprovado_por,observacoes,created_at";
const graduacaoSolicitacoesColumns = "id,aluno_id,user_id,categoria,faixa,graus,data_ultima_graduacao,academia_origem,professor_graduador,observacoes,status,analisado_por,analisado_em,created_at,updated_at";
const pagamentosColumns = "id,aluno_id,valor,data_vencimento,data_pagamento,status,observacoes,created_at,updated_at";
const alunoObservacoesColumns = "id,aluno_id,autor_id,tipo,visibilidade,conteudo,created_at,updated_at";
const alunoEventosColumns = "id,aluno_id,tipo,titulo,descricao,criado_por,created_at";
const tabs: { id: FichaTab; label: string }[] = [
  { id: "dados", label: "Dados gerais" },
  { id: "graduacao", label: "Graduação" },
  { id: "financeiro", label: "Financeiro" },
  { id: "responsaveis", label: "Responsáveis" },
  { id: "historico", label: "Histórico" },
];
const INADIMPLENCIA_DIAS = 1;
const observacaoTipos: AlunoObservacaoTipo[] = ["geral", "financeiro", "graduação", "comportamento", "saúde"];
const observacaoVisibilidades: AlunoObservacaoVisibilidade[] = ["interna", "aluno", "responsavel"];

function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data.slice(0, 10)}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatarValor(valor?: number | null) {
  if (valor == null) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function diferencaDias(data: string) {
  const hoje = new Date();
  const vencimento = new Date(`${data}T00:00:00`);
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000);
}

function diaVencimento(aluno: Aluno) {
  return aluno.dia_vencimento_pagamento ?? aluno.vencimento;
}

function dataVencimentoAtual(aluno: Aluno) {
  const hoje = new Date();
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
  const diaSeguro = Math.min(Math.max(diaVencimento(aluno), 1), ultimoDiaMes);
  return new Date(hoje.getFullYear(), hoje.getMonth(), diaSeguro).toISOString().slice(0, 10);
}

function calcularStatusFinanceiro(aluno: Aluno, pagamento?: Pagamento) {
  const dataVencimento = pagamento?.data_vencimento ?? dataVencimentoAtual(aluno);

  if (pagamento?.status === "cancelado") return { status: "cancelado" as const, dataVencimento, diasEmAtraso: 0 };
  if (pagamento?.status === "pago" || pagamento?.data_pagamento || aluno.pago) return { status: "pago" as const, dataVencimento, diasEmAtraso: 0 };

  const diasParaVencer = diferencaDias(dataVencimento);
  const diasEmAtraso = Math.max(0, -diasParaVencer);

  if (diasEmAtraso > INADIMPLENCIA_DIAS) return { status: "inadimplente" as const, dataVencimento, diasEmAtraso };
  if (diasEmAtraso > 0) return { status: "atrasado" as const, dataVencimento, diasEmAtraso };
  if (diasParaVencer === 0) return { status: "vence_hoje" as const, dataVencimento, diasEmAtraso: 0 };
  return { status: "aberto" as const, dataVencimento, diasEmAtraso: 0 };
}

const statusFinanceiroLabel: Record<StatusFinanceiro, string> = {
  pago: "Pago",
  aberto: "Em aberto",
  vence_hoje: "Vence hoje",
  atrasado: "Vencido/atrasado",
  inadimplente: "Inadimplente",
  cancelado: "Cancelado",
};

function textoStatusFinanceiro(status: StatusFinanceiro, diasEmAtraso: number) {
  if (status === "atrasado") return `Atrasado há ${diasEmAtraso} ${diasEmAtraso === 1 ? "dia" : "dias"}`;
  if (status === "inadimplente") return `Inadimplente há ${diasEmAtraso} dias`;
  return statusFinanceiroLabel[status];
}

function InfoItem({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-bold text-zinc-100">{value ?? "-"}</p>
    </div>
  );
}

function LoadingFicha() {
  return <div className="min-h-dvh bg-zinc-950 p-4 sm:p-6 text-white"><div className="mx-auto max-w-6xl rounded-[32px] border border-zinc-800 bg-zinc-900 p-6 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Carregando ficha...</div></div>;
}

function FichaAlunoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const alunoId = searchParams.get("id");
  const [activeTab, setActiveTab] = useState<FichaTab>("dados");
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [graduacaoHistorico, setGraduacaoHistorico] = useState<GraduacaoHistorico[]>([]);
  const [graduacaoSolicitacoes, setGraduacaoSolicitacoes] = useState<GraduacaoSolicitacao[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [responsaveis, setResponsaveis] = useState<Profile[]>([]);
  const [alunoObservacoes, setAlunoObservacoes] = useState<AlunoObservacao[]>([]);
  const [alunoEventos, setAlunoEventos] = useState<AlunoEvento[]>([]);
  const [novaObservacao, setNovaObservacao] = useState({ tipo: "geral" as AlunoObservacaoTipo, visibilidade: "interna" as AlunoObservacaoVisibilidade, conteudo: "" });
  const [salvandoObservacao, setSalvandoObservacao] = useState(false);
  const [role, setRole] = useState<AppRole | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarFicha() {
      setCarregando(true);
      setErro(null);

      const profile = await getCurrentProfile();
      if (!ativo) return;

      if (!profile) {
        router.replace("/");
        return;
      }

      if (!canAccessDashboard(profile.role)) {
        router.replace(getHomeRouteForRole(profile.role));
        return;
      }

      setRole(profile.role);

      if (!alunoId) {
        setErro("Aluno não informado.");
        setCarregando(false);
        return;
      }

      const { data: alunoData, error: alunoError } = await supabase
        .from("alunos")
        .select(alunoColumns)
        .eq("id", alunoId)
        .maybeSingle();

      if (alunoError || !alunoData) {
        logClientError("Failed to load student file", alunoError);
        setErro(genericLoadError);
        setCarregando(false);
        return;
      }

      setAluno(alunoData);

      const [
        historicoResult,
        solicitacoesResult,
        pagamentosResult,
        responsaveisResult,
        observacoesResult,
        eventosResult,
      ] = await Promise.all([
        supabase.from("graduacao_historico").select(graduacaoHistoricoColumns).eq("aluno_id", alunoId).order("created_at", { ascending: false }),
        supabase.from("graduacao_solicitacoes").select(graduacaoSolicitacoesColumns).eq("aluno_id", alunoId).order("created_at", { ascending: false }),
        supabase.from("pagamentos").select(pagamentosColumns).eq("aluno_id", alunoId).order("data_vencimento", { ascending: false }),
        supabase.from("responsavel_alunos").select("responsavel_id,aluno_id,created_at").eq("aluno_id", alunoId),
        supabase.from("aluno_observacoes").select(alunoObservacoesColumns).eq("aluno_id", alunoId).order("created_at", { ascending: false }),
        supabase.from("aluno_eventos").select(alunoEventosColumns).eq("aluno_id", alunoId).order("created_at", { ascending: false }),
      ]);

      if (historicoResult.error) logClientError("Failed to load graduation history", historicoResult.error);
      if (solicitacoesResult.error) logClientError("Failed to load graduation requests", solicitacoesResult.error);
      if (pagamentosResult.error) logClientError("Failed to load payments", pagamentosResult.error);
      if (responsaveisResult.error) logClientError("Failed to load responsible links", responsaveisResult.error);
      if (observacoesResult.error) logClientError("Failed to load student notes", observacoesResult.error);
      if (eventosResult.error) logClientError("Failed to load student events", eventosResult.error);

      setGraduacaoHistorico(historicoResult.data ?? []);
      setGraduacaoSolicitacoes(solicitacoesResult.data ?? []);
      setPagamentos(pagamentosResult.data ?? []);
      setAlunoObservacoes(observacoesResult.data ?? []);
      setAlunoEventos(eventosResult.data ?? []);

      const vinculos = (responsaveisResult.data ?? []) as ResponsavelAluno[];
      const responsavelIds = vinculos.map((vinculo) => vinculo.responsavel_id);

      if (responsavelIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("id,email,role,created_at,updated_at")
          .in("id", responsavelIds);

        if (profilesError) {
          logClientError("Failed to load responsible profiles", profilesError);
          setResponsaveis([]);
        } else {
          setResponsaveis(profilesData ?? []);
        }
      } else {
        setResponsaveis([]);
      }

      setCarregando(false);
    }

    void carregarFicha();

    return () => {
      ativo = false;
    };
  }, [alunoId, router]);

  const ultimoPagamento = pagamentos.find((pagamento) => pagamento.status === "pago" || pagamento.data_pagamento) ?? pagamentos[0];
  const financeiro = aluno ? calcularStatusFinanceiro(aluno, ultimoPagamento) : null;
  const cobrancasFinanceiro = aluno
    ? pagamentos.map((pagamento) => ({
      pagamento,
      valor: Number(pagamento.valor ?? 0),
      ...calcularStatusFinanceiro(aluno, pagamento),
    }))
    : [];
  const valorEmAberto = cobrancasFinanceiro
    .filter((cobranca) => cobranca.status === "aberto" || cobranca.status === "vence_hoje")
    .reduce((total, cobranca) => total + cobranca.valor, 0);
  const valorVencido = cobrancasFinanceiro
    .filter((cobranca) => cobranca.status === "atrasado" || cobranca.status === "inadimplente")
    .reduce((total, cobranca) => total + cobranca.valor, 0);
  const maiorAtraso = cobrancasFinanceiro.reduce((maior, cobranca) => Math.max(maior, cobranca.diasEmAtraso), 0);


  async function adicionarObservacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aluno || !role || !canAccessDashboard(role) || !novaObservacao.conteudo.trim()) return;

    setSalvandoObservacao(true);
    const profile = await getCurrentProfile();
    const { error } = await supabase.from("aluno_observacoes").insert({
      aluno_id: aluno.id,
      autor_id: profile?.id ?? null,
      tipo: novaObservacao.tipo,
      visibilidade: novaObservacao.visibilidade,
      conteudo: novaObservacao.conteudo.trim(),
    });

    if (error) {
      logClientError("Failed to create student note", error);
      setErro(genericSaveError);
      setSalvandoObservacao(false);
      return;
    }

    await supabase.from("aluno_eventos").insert({
      aluno_id: aluno.id,
      tipo: "observacao",
      titulo: "Observação adicionada",
      descricao: `Observação ${novaObservacao.tipo} adicionada.`,
      criado_por: profile?.id ?? null,
    });

    setNovaObservacao({ tipo: "geral", visibilidade: "interna", conteudo: "" });
    setSalvandoObservacao(false);
    router.refresh();
    window.location.reload();
  }
  const eventos = useMemo<EventoHistorico[]>(() => {
    if (!aluno) return [];

    const cadastro: EventoHistorico[] = [
      {
        data: aluno.created_at,
        titulo: "Cadastro criado",
        detalhe: `Aluno ${aluno.nome} foi cadastrado.`,
      },
    ];

    const graduacoes = graduacaoHistorico.map<EventoHistorico>((item) => ({
      data: item.created_at ?? item.data_graduacao,
      titulo: "Graduação aprovada",
      detalhe: `Faixa ${item.faixa}, ${item.graus} graus.`,
    }));

    const pagamentosEventos = pagamentos.map<EventoHistorico>((pagamento) => ({
      data: pagamento.data_pagamento ?? pagamento.created_at,
      titulo: "Pagamento registrado",
      detalhe: `${statusFinanceiroLabel[pagamento.status === "vencido" ? "atrasado" : pagamento.status]} - vencimento ${formatarData(pagamento.data_vencimento)}.`,
    }));

    const eventosManuais = alunoEventos.map<EventoHistorico>((evento) => ({ data: evento.created_at, titulo: evento.titulo, detalhe: evento.descricao ?? evento.tipo }));

    return [...cadastro, ...graduacoes, ...pagamentosEventos, ...eventosManuais].sort((a, b) => {
      const dataA = a.data ? new Date(a.data).getTime() : 0;
      const dataB = b.data ? new Date(b.data).getTime() : 0;
      return dataB - dataA;
    });
  }, [aluno, alunoEventos, graduacaoHistorico, pagamentos]);

  if (carregando) {
    return <LoadingFicha />;
  }

  if (erro || !aluno) {
    return <div className="min-h-dvh bg-zinc-950 p-4 sm:p-6 text-white"><div className="mx-auto max-w-6xl rounded-[32px] border border-red-500/30 bg-red-500/10 p-6 text-sm font-bold text-red-400">{erro ?? "Aluno não encontrado."}</div></div>;
  }

  return (
    <div className="min-h-dvh bg-zinc-950 p-4 sm:p-6 text-white">
      <header className="mx-auto mb-8 flex max-w-6xl flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/dashboard" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white">Voltar ao dashboard</Link>
          <h1 className="mt-2 text-3xl font-black uppercase italic">{aluno.nome}</h1>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">{role === "admin" ? "Ficha completa do atleta" : "Visualização da ficha do atleta"}</p>
        </div>
        <div className="flex max-w-full gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 rounded-2xl px-4 py-3 text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6">
        <section className="rounded-[32px] border border-red-500/20 bg-red-500/10 p-5 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-300">Sobre o Beta</p>
          <h2 className="mt-2 text-xl font-black uppercase italic">ROXBJJ PLANALTO Beta 1.0</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-zinc-300">Ficha em revisão para testes com usuários reais. Erros ou sugestões devem ser enviados para a administração.</p>
        </section>
        {activeTab === "dados" && (
          <section className="grid gap-6">
            <div className={`rounded-[32px] border p-5 ${aluno.cadastro_completo ? "border-green-500/30 bg-green-500/10" : "border-yellow-400/30 bg-yellow-400/10"}`}>
              <p className={`text-[10px] font-black uppercase tracking-widest ${aluno.cadastro_completo ? "text-green-300" : "text-yellow-100"}`}>{aluno.cadastro_completo ? "Cadastro completo" : "Cadastro incompleto"}</p>
              <p className="mt-2 text-xs font-bold text-zinc-400">Atualizado em {formatarData(aluno.cadastro_atualizado_em)}</p>
            </div>

            <section className="grid gap-4 md:grid-cols-2">
              <InfoItem label="Nome" value={aluno.nome} />
              <InfoItem label="Nome social/apelido" value={aluno.nome_social} />
              <InfoItem label="CPF" value={aluno.cpf} />
              <InfoItem label="RG" value={aluno.rg} />
              <InfoItem label="Data de nascimento" value={formatarData(aluno.data_nascimento)} />
              <InfoItem label="E-mail" value={aluno.email} />
              <InfoItem label="Telefone" value={aluno.telefone} />
              <InfoItem label="WhatsApp" value={aluno.whatsapp} />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <InfoItem label="CEP" value={aluno.cep} />
              <InfoItem label="Rua" value={aluno.rua} />
              <InfoItem label="Número" value={aluno.numero} />
              <InfoItem label="Complemento" value={aluno.complemento} />
              <InfoItem label="Bairro" value={aluno.bairro} />
              <InfoItem label="Cidade/Estado" value={`${aluno.cidade ?? "-"}/${aluno.estado ?? "-"}`} />
            </section>

            <section className="grid gap-4 md:grid-cols-3">
              <InfoItem label="Contato de emergência" value={aluno.contato_emergencia_nome} />
              <InfoItem label="Telefone de emergência" value={aluno.contato_emergencia_telefone} />
              <InfoItem label="Parentesco" value={aluno.contato_emergencia_parentesco} />
              <InfoItem label="Tipo sanguíneo" value={aluno.tipo_sanguineo} />
              <InfoItem label="Alergias" value={aluno.alergias} />
              <InfoItem label="Restrições médicas" value={aluno.restricoes_medicas} />
              <InfoItem label="Medicamentos contínuos" value={aluno.medicamentos_uso_continuo} />
              <InfoItem label="Observações médicas" value={aluno.observacoes_medicas} />
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <InfoItem label="Responsável principal" value={aluno.responsavel_principal_nome} />
              <InfoItem label="Telefone do responsável" value={aluno.responsavel_principal_telefone} />
              <InfoItem label="WhatsApp do responsável" value={aluno.responsavel_principal_whatsapp} />
              <InfoItem label="E-mail do responsável" value={aluno.responsavel_principal_email} />
              <InfoItem label="Parentesco do responsável" value={aluno.responsavel_principal_parentesco} />
              <InfoItem label="Observações do aluno" value={aluno.observacoes ?? "Sem observações"} />
            </section>
          </section>
        )}

        {activeTab === "graduacao" && (
          <section className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <InfoItem label="Categoria" value={aluno.categoria} />
              <InfoItem label="Faixa" value={aluno.faixa} />
              <InfoItem label="Graus" value={aluno.graus ?? aluno.grau} />
              <InfoItem label="Graduação" value={aluno.graduacao_aprovada ? "Aprovada" : "Não aprovada"} />
            </div>

            <div className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-black uppercase italic">Histórico de graduação</h2>
              {graduacaoHistorico.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum histórico de graduação</div>
              ) : (
                <div className="grid gap-3">
                  {graduacaoHistorico.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                      <h3 className="font-black uppercase">Faixa {item.faixa} • {item.graus} graus</h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatarData(item.data_graduacao ?? item.created_at)} • {item.origem}</p>
                      {item.observacoes && <p className="mt-2 text-xs text-zinc-400">{item.observacoes}</p>}
                    </article>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-black uppercase italic">Solicitações</h2>
              {graduacaoSolicitacoes.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhuma solicitação registrada</div>
              ) : (
                <div className="grid gap-3">
                  {graduacaoSolicitacoes.map((solicitacao) => (
                    <article key={solicitacao.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                      <h3 className="font-black uppercase">{solicitacao.status} • Faixa {solicitacao.faixa}</h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatarData(solicitacao.created_at)}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "financeiro" && financeiro && (
          <section className="grid gap-6">
            <div className="grid gap-4 md:grid-cols-4">
              <InfoItem label="Status financeiro" value={textoStatusFinanceiro(financeiro.status, financeiro.diasEmAtraso)} />
              <InfoItem label="Dia de vencimento" value={diaVencimento(aluno)} />
              <InfoItem label="Vencimento atual" value={formatarData(financeiro.dataVencimento)} />
              <InfoItem label="Último pagamento" value={formatarData(ultimoPagamento?.data_pagamento)} />
              <InfoItem label="Valores em aberto" value={formatarValor(valorEmAberto)} />
              <InfoItem label="Valores vencidos" value={formatarValor(valorVencido)} />
              <InfoItem label="Maior atraso" value={`${maiorAtraso} ${maiorAtraso === 1 ? "dia" : "dias"}`} />
            </div>

            <div className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-black uppercase italic">Pagamentos</h2>
              {pagamentos.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum pagamento registrado</div>
              ) : (
                <div className="grid gap-3">
                  {pagamentos.map((pagamento) => (
                    <article key={pagamento.id} className="grid gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 lg:grid-cols-5 lg:items-center">
                      <h3 className="font-black uppercase">{textoStatusFinanceiro(calcularStatusFinanceiro(aluno, pagamento).status, calcularStatusFinanceiro(aluno, pagamento).diasEmAtraso)}</h3>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Vence: {formatarData(pagamento.data_vencimento)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Pago em: {formatarData(pagamento.data_pagamento)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Valor: {formatarValor(pagamento.valor)}</p>
                      <p className="text-xs text-zinc-400">{pagamento.observacoes ?? "Sem observação"}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === "responsaveis" && (
          <section className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="mb-4 text-lg font-black uppercase italic">Responsáveis vinculados</h2>
            {responsaveis.length === 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum responsável vinculado</div>
            ) : (
              <div className="grid gap-3">
                {responsaveis.map((responsavel) => (
                  <article key={responsavel.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                    <h3 className="font-black uppercase">{responsavel.email}</h3>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Perfil: {responsavel.role}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === "historico" && (
          <section className="grid gap-6">
            <section className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-black uppercase italic">Observações internas</h2>
              <form onSubmit={adicionarObservacao} className="mb-5 grid gap-3 md:grid-cols-4">
                <select value={novaObservacao.tipo} onChange={(event) => setNovaObservacao((atual) => ({ ...atual, tipo: event.target.value as AlunoObservacaoTipo }))} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-bold outline-none">
                  {observacaoTipos.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                </select>
                <select value={novaObservacao.visibilidade} onChange={(event) => setNovaObservacao((atual) => ({ ...atual, visibilidade: event.target.value as AlunoObservacaoVisibilidade }))} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-bold outline-none">
                  {observacaoVisibilidades.map((visibilidade) => <option key={visibilidade} value={visibilidade}>{visibilidade}</option>)}
                </select>
                <input value={novaObservacao.conteudo} onChange={(event) => setNovaObservacao((atual) => ({ ...atual, conteudo: event.target.value }))} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none" placeholder="Nova observação" />
                <button disabled={salvandoObservacao || !novaObservacao.conteudo.trim()} className="rounded-2xl bg-white p-3 text-[10px] font-black uppercase text-black disabled:opacity-50">Adicionar</button>
              </form>
              {alunoObservacoes.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhuma observação registrada</div>
              ) : (
                <div className="grid gap-3">
                  {alunoObservacoes.map((observacao) => (
                    <article key={observacao.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                      <h3 className="font-black uppercase">{observacao.tipo} • {observacao.visibilidade}</h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatarData(observacao.created_at)}</p>
                      <p className="mt-2 text-xs leading-5 text-zinc-400">{observacao.conteudo}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[32px] border border-zinc-800 bg-zinc-900 p-6">
              <h2 className="mb-4 text-lg font-black uppercase italic">Eventos básicos</h2>
              {eventos.length === 0 ? (
                <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum evento registrado</div>
              ) : (
                <div className="grid gap-3">
                  {eventos.map((evento, index) => (
                    <article key={`${evento.titulo}-${index}`} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
                      <h3 className="font-black uppercase">{evento.titulo}</h3>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">{formatarData(evento.data)}</p>
                      <p className="mt-2 text-xs text-zinc-400">{evento.detalhe}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        )}      </main>
    </div>
  );
}

export default function FichaAlunoPage() {
  return (
    <Suspense fallback={<LoadingFicha />}>
      <FichaAlunoContent />
    </Suspense>
  );
}
