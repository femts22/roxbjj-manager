"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlunoCard } from "@/components/dashboard/AlunoCard";
import { AlunoForm, type AlunoFormValues } from "@/components/dashboard/AlunoForm";
import { AlunosFilters, type FiltroPagamento } from "@/components/dashboard/AlunosFilters";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { canAccessDashboard, canManageAlunos, genericLoadError, genericSaveError, getCurrentProfile, getHomeRouteForRole, logClientError } from "@/lib/auth";
import { faixaCompativelComCategoria, faixasPorCategoria } from "@/lib/graduacao";
import { supabase } from "@/lib/supabase";
import type { Aluno, AlunoInsert, AlunoUpdate, AppRole, CategoriaGraduacao, Faixa, GraduacaoSolicitacao, Pagamento, PagamentoVencimentoSolicitacao } from "@/lib/types";

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

type AdminTab = "atletas" | "cadastro" | "graduacoes" | "pagamentos";
type GraduacaoCardStatus = "pendente" | "aprovada" | "sem_graduacao";
type PagamentoResumoStatus = "pago" | "aberto" | "vence_hoje" | "atrasado" | "inadimplente" | "cancelado";
type PagamentoResumo = {
  aluno: Aluno;
  pagamento?: Pagamento;
  dataVencimento: string;
  diasEmAtraso: number;
  status: PagamentoResumoStatus;
};

const alunosColumns = "id,user_id,nome,email,categoria,faixa,grau,graus,graduacao_aprovada,pago,vencimento,dia_vencimento_pagamento,presencas,telefone,data_nascimento,observacoes";
const graduacaoSolicitacoesColumns = "id,aluno_id,user_id,categoria,faixa,graus,data_ultima_graduacao,academia_origem,professor_graduador,observacoes,status,analisado_por,analisado_em,created_at,updated_at";
const pagamentosColumns = "id,aluno_id,valor,data_vencimento,data_pagamento,status,observacoes,created_at,updated_at";
const vencimentoSolicitacoesColumns = "id,aluno_id,user_id,dia_atual,dia_solicitado,motivo,status,analisado_por,analisado_em,created_at,updated_at";
const faixas: Faixa[] = ["branca", "azul", "roxa", "marrom", "preta"];
const itensPorPagina = 6;
const INADIMPLENCIA_DIAS = 1;

const tabs: { id: AdminTab; label: string }[] = [
  { id: "atletas", label: "Atletas" },
  { id: "cadastro", label: "Cadastrar aluno" },
  { id: "graduacoes", label: "Graduações pendentes" },
  { id: "pagamentos", label: "Pagamentos" },
];

const formInicial: AlunoFormValues = {
  user_id: "",
  responsavel_user_id: "",
  nome: "",
  email: "",
  telefone: "",
  data_nascimento: "",
  observacoes: "",
  categoria: "adulto",
  faixa: "branca",
  grau: "0",
  pago: false,
  vencimento: "10",
  dia_vencimento_pagamento: "10",
  presencas: "0",
};

function normalizarTexto(valor: string) {
  return valor.trim().toLowerCase();
}

function validarFormulario(form: AlunoFormValues): string | null {
  const userId = form.user_id.trim();
  const responsavelUserId = form.responsavel_user_id.trim();
  const nome = form.nome.trim();
  const email = form.email.trim();
  const grau = Number(form.grau);
  const vencimento = Number(form.vencimento);
  const diaVencimentoPagamento = Number(form.dia_vencimento_pagamento);
  const presencas = Number(form.presencas);

  if (!userId) return "Informe o User ID do usuário Auth do Supabase.";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
    return "Informe um User ID válido do Supabase Auth.";
  }
  if (responsavelUserId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(responsavelUserId)) {
    return "Informe um User ID válido para o responsável.";
  }
  if (nome.length < 3) return "Informe um nome com pelo menos 3 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail válido.";
  if (!faixaCompativelComCategoria(form.categoria, form.faixa)) return "A faixa deve ser compatível com a categoria.";
  if (!Number.isInteger(grau) || grau < 0 || grau > 4) return "O grau deve estar entre 0 e 4.";
  if (!Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) return "O vencimento deve estar entre 1 e 31.";
  if (!Number.isInteger(diaVencimentoPagamento) || diaVencimentoPagamento < 1 || diaVencimentoPagamento > 31) return "O dia de vencimento do pagamento deve estar entre 1 e 31.";
  if (!Number.isInteger(presencas) || presencas < 0) return "As presenças devem ser um número inteiro positivo.";

  return null;
}

function montarPayload(form: AlunoFormValues): AlunoInsert {
  return {
    user_id: form.user_id.trim(),
    nome: form.nome.trim(),
    email: form.email.trim().toLowerCase(),
    telefone: form.telefone.trim() || null,
    data_nascimento: form.data_nascimento || null,
    observacoes: form.observacoes.trim() || null,
    categoria: form.categoria,
    faixa: form.faixa,
    grau: Number(form.grau),
    graus: Number(form.grau),
    graduacao_aprovada: true,
    pago: form.pago,
    vencimento: Number(form.vencimento),
    dia_vencimento_pagamento: Number(form.dia_vencimento_pagamento),
    presencas: Number(form.presencas),
  };
}

function alunoParaForm(aluno: Aluno, responsavelId?: string): AlunoFormValues {
  const diaVencimentoPagamento = aluno.dia_vencimento_pagamento ?? aluno.vencimento;

  return {
    user_id: aluno.user_id ?? "",
    responsavel_user_id: responsavelId ?? "",
    nome: aluno.nome,
    email: aluno.email,
    telefone: aluno.telefone ?? "",
    data_nascimento: aluno.data_nascimento ?? "",
    observacoes: aluno.observacoes ?? "",
    categoria: aluno.categoria,
    faixa: aluno.faixa,
    grau: String(aluno.graus ?? aluno.grau),
    pago: aluno.pago,
    vencimento: String(aluno.vencimento),
    dia_vencimento_pagamento: String(diaVencimentoPagamento),
    presencas: String(aluno.presencas ?? 0),
  };
}

function formatarData(data?: string | null) {
  if (!data) return "-";
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR");
}

function diferencaDias(data: string) {
  const hoje = new Date();
  const vencimento = new Date(`${data}T00:00:00`);
  hoje.setHours(0, 0, 0, 0);
  return Math.ceil((vencimento.getTime() - hoje.getTime()) / 86400000);
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10);
}

function diaPagamentoAluno(aluno: Aluno) {
  return aluno.dia_vencimento_pagamento ?? aluno.vencimento;
}

function dataVencimentoAtual(dia: number) {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();
  const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
  const diaSeguro = Math.min(Math.max(dia, 1), ultimoDiaMes);
  const data = new Date(ano, mes, diaSeguro);
  return data.toISOString().slice(0, 10);
}

function calcularResumoPagamento(aluno: Aluno, pagamento?: Pagamento): PagamentoResumo {
  const dataVencimento = pagamento?.data_vencimento ?? dataVencimentoAtual(diaPagamentoAluno(aluno));

  if (pagamento?.status === "cancelado") {
    return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "cancelado" };
  }

  if (pagamento?.status === "pago" || pagamento?.data_pagamento || aluno.pago) {
    return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "pago" };
  }

  const diasParaVencer = diferencaDias(dataVencimento);
  const diasEmAtraso = Math.max(0, -diasParaVencer);

  if (diasEmAtraso > INADIMPLENCIA_DIAS) return { aluno, pagamento, dataVencimento, diasEmAtraso, status: "inadimplente" };
  if (diasEmAtraso > 0) return { aluno, pagamento, dataVencimento, diasEmAtraso, status: "atrasado" };
  if (diasParaVencer === 0) return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "vence_hoje" };
  return { aluno, pagamento, dataVencimento, diasEmAtraso: 0, status: "aberto" };
}

const pagamentoStatusLabel: Record<PagamentoResumoStatus, string> = {
  pago: "Pago",
  aberto: "Em aberto",
  vence_hoje: "Vence hoje",
  atrasado: "Vencido/atrasado",
  inadimplente: "Inadimplente",
  cancelado: "Cancelado",
};

const pagamentoStatusClass: Record<PagamentoResumoStatus, string> = {
  pago: "bg-green-500 text-black",
  aberto: "bg-zinc-800 text-zinc-300",
  vence_hoje: "bg-yellow-400 text-black",
  atrasado: "bg-red-600 text-white",
  inadimplente: "bg-red-900 text-red-100",
  cancelado: "bg-zinc-800 text-zinc-400",
};

function formatarValor(valor?: number | null) {
  if (valor == null) return "-";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);
}

function textoStatusPagamento(resumo: PagamentoResumo) {
  if (resumo.status === "atrasado") return `Atrasado há ${resumo.diasEmAtraso} ${resumo.diasEmAtraso === 1 ? "dia" : "dias"}`;
  if (resumo.status === "inadimplente") return `Inadimplente há ${resumo.diasEmAtraso} dias`;
  return pagamentoStatusLabel[resumo.status];
}

export default function DashboardAdmin() {
  const [activeTab, setActiveTab] = useState<AdminTab>("atletas");
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [graduacoesPendentes, setGraduacoesPendentes] = useState<GraduacaoSolicitacao[]>([]);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [vencimentoSolicitacoes, setVencimentoSolicitacoes] = useState<PagamentoVencimentoSolicitacao[]>([]);
  const [responsaveisPorAluno, setResponsaveisPorAluno] = useState<Record<string, string>>({});
  const [form, setForm] = useState<AlunoFormValues>(formInicial);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState<string | null>(null);
  const [filtroPagamento, setFiltroPagamento] = useState<FiltroPagamento>("todos");
  const [filtroFaixa, setFiltroFaixa] = useState<Faixa | "todas">("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [pagamentoEmAtualizacao, setPagamentoEmAtualizacao] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const router = useRouter();
  const canManage = canManageAlunos(role);
  const alunosPorId = useMemo(() => new Map(alunos.map((aluno) => [aluno.id, aluno])), [alunos]);
  const faixasFormulario = faixasPorCategoria[form.categoria];

  async function carregarAlunos() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("alunos")
      .select(alunosColumns)
      .order("nome", { ascending: true });

    if (error) {
      logClientError("Failed to load alunos", error);
      setMensagem({ tipo: "erro", texto: genericLoadError });
      setAlunos([]);
      setResponsaveisPorAluno({});
    } else {
      setAlunos(data ?? []);

      const { data: vinculos, error: vinculosError } = await supabase
        .from("responsavel_alunos")
        .select("aluno_id,responsavel_id");

      if (vinculosError) {
        logClientError("Failed to load responsible links", vinculosError);
        setResponsaveisPorAluno({});
      } else {
        setResponsaveisPorAluno(
          (vinculos ?? []).reduce<Record<string, string>>((mapa, vinculo) => {
            mapa[vinculo.aluno_id] = vinculo.responsavel_id;
            return mapa;
          }, {}),
        );
      }
    }

    setCarregando(false);
  }

  async function carregarGraduacoesPendentes() {
    const { data, error } = await supabase
      .from("graduacao_solicitacoes")
      .select(graduacaoSolicitacoesColumns)
      .eq("status", "pendente")
      .order("created_at", { ascending: true });

    if (error) {
      logClientError("Failed to load graduation requests", error);
      setGraduacoesPendentes([]);
      return;
    }

    setGraduacoesPendentes(data ?? []);
  }

  async function carregarPagamentos() {
    const { data, error } = await supabase
      .from("pagamentos")
      .select(pagamentosColumns)
      .order("data_vencimento", { ascending: false });

    if (error) {
      logClientError("Failed to load payments", error);
      setPagamentos([]);
      return;
    }

    setPagamentos(data ?? []);
  }

  async function carregarSolicitacoesVencimento() {
    const { data, error } = await supabase
      .from("pagamento_vencimento_solicitacoes")
      .select(vencimentoSolicitacoesColumns)
      .eq("status", "pendente")
      .order("created_at", { ascending: true });

    if (error) {
      logClientError("Failed to load due date requests", error);
      setVencimentoSolicitacoes([]);
      return;
    }

    setVencimentoSolicitacoes(data ?? []);
  }

  useEffect(() => {
    let ativo = true;

    async function inicializar() {
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
      await carregarAlunos();
      await carregarGraduacoesPendentes();
      await carregarPagamentos();
      await carregarSolicitacoesVencimento();
    }

    void inicializar();

    return () => {
      ativo = false;
    };
  }, [router]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroPagamento, filtroFaixa, pesquisa]);

  const graduacoesPendentesPorAluno = useMemo(() => new Set(graduacoesPendentes.map((solicitacao) => solicitacao.aluno_id)), [graduacoesPendentes]);

  const ultimoPagamentoPorAluno = useMemo(() => {
    return pagamentos.reduce<Map<string, Pagamento>>((mapa, pagamento) => {
      if (!mapa.has(pagamento.aluno_id)) mapa.set(pagamento.aluno_id, pagamento);
      return mapa;
    }, new Map());
  }, [pagamentos]);

  const pagamentosResumo = useMemo(() => {
    return alunos.map((aluno) => calcularResumoPagamento(aluno, ultimoPagamentoPorAluno.get(aluno.id)));
  }, [alunos, ultimoPagamentoPorAluno]);

  const pagamentosResumoContadores = useMemo(() => {
    return pagamentosResumo.reduce<Record<PagamentoResumoStatus, number>>(
      (contadores, resumo) => {
        contadores[resumo.status] += 1;
        return contadores;
      },
      { pago: 0, aberto: 0, vence_hoje: 0, atrasado: 0, inadimplente: 0, cancelado: 0 },
    );
  }, [pagamentosResumo]);

  const alunosFiltrados = useMemo(() => {
    const diaAtual = new Date().getDate();
    const termo = normalizarTexto(pesquisa);

    return alunos.filter((aluno) => {
      const diaVencimento = diaPagamentoAluno(aluno);
      const passaPagamento =
        filtroPagamento === "todos" ||
        (filtroPagamento === "pagos" && aluno.pago) ||
        (filtroPagamento === "pendentes" && !aluno.pago && diaVencimento < diaAtual);

      const passaFaixa = filtroFaixa === "todas" || aluno.faixa === filtroFaixa;
      const passaPesquisa =
        termo.length === 0 ||
        normalizarTexto(aluno.nome).includes(termo) ||
        normalizarTexto(aluno.email).includes(termo);

      return passaPagamento && passaFaixa && passaPesquisa;
    });
  }, [alunos, filtroFaixa, filtroPagamento, pesquisa]);

  const totalPaginas = Math.max(1, Math.ceil(alunosFiltrados.length / itensPorPagina));
  const inicioPagina = (paginaAtual - 1) * itensPorPagina;
  const alunosPaginados = alunosFiltrados.slice(inicioPagina, inicioPagina + itensPorPagina);

  useEffect(() => {
    setPaginaAtual((pagina) => Math.min(pagina, totalPaginas));
  }, [totalPaginas]);

  function statusGraduacao(aluno: Aluno): GraduacaoCardStatus {
    if (graduacoesPendentesPorAluno.has(aluno.id)) return "pendente";
    if (aluno.graduacao_aprovada) return "aprovada";
    return "sem_graduacao";
  }

  function atualizarCampo<K extends keyof AlunoFormValues>(campo: K, valor: AlunoFormValues[K]) {
    setForm((atual) => {
      if (campo === "categoria") {
        const categoria = valor as CategoriaGraduacao;
        const faixaAtual = faixaCompativelComCategoria(categoria, atual.faixa) ? atual.faixa : faixasPorCategoria[categoria][0];
        return { ...atual, categoria, faixa: faixaAtual };
      }

      return { ...atual, [campo]: valor };
    });
  }

  function limparFormulario() {
    setForm(formInicial);
    setAlunoEmEdicao(null);
  }

  function iniciarEdicao(aluno: Aluno) {
    setForm(alunoParaForm(aluno, responsaveisPorAluno[aluno.id]));
    setAlunoEmEdicao(aluno.id);
    setMensagem(null);
    setActiveTab("cadastro");
  }

  async function salvarVinculoResponsavel(alunoId: string, responsavelId: string) {
    const { error: deleteError } = await supabase.from("responsavel_alunos").delete().eq("aluno_id", alunoId);

    if (deleteError) {
      logClientError("Failed to clear responsible link", deleteError);
      return deleteError;
    }

    if (!responsavelId) return null;

    const { error: insertError } = await supabase
      .from("responsavel_alunos")
      .insert({ aluno_id: alunoId, responsavel_id: responsavelId });

    if (insertError) logClientError("Failed to save responsible link", insertError);
    return insertError;
  }

  async function salvarAluno(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canManage) {
      setMensagem({ tipo: "erro", texto: "Você não tem permissão para gerenciar alunos." });
      return;
    }

    const erroValidacao = validarFormulario(form);

    if (erroValidacao) {
      setMensagem({ tipo: "erro", texto: erroValidacao });
      return;
    }

    setSalvando(true);
    setMensagem(null);

    if (alunoEmEdicao) {
      const payload: AlunoUpdate = montarPayload(form);
      const { error } = await supabase.from("alunos").update(payload).eq("id", alunoEmEdicao);

      if (error) {
        logClientError("Failed to update aluno", error);
        setMensagem({ tipo: "erro", texto: genericSaveError });
      } else {
        const vinculoError = await salvarVinculoResponsavel(alunoEmEdicao, form.responsavel_user_id.trim());

        if (vinculoError) {
          setMensagem({ tipo: "erro", texto: genericSaveError });
          setSalvando(false);
          return;
        }

        setMensagem({ tipo: "sucesso", texto: "Aluno atualizado com sucesso." });
        limparFormulario();
        await carregarAlunos();
        setActiveTab("atletas");
      }
    } else {
      const payload = montarPayload(form);
      const { data, error } = await supabase.from("alunos").insert(payload).select("id").single();

      if (error || !data) {
        logClientError("Failed to insert aluno", error);
        setMensagem({ tipo: "erro", texto: genericSaveError });
      } else {
        const vinculoError = await salvarVinculoResponsavel(data.id, form.responsavel_user_id.trim());

        if (vinculoError) {
          setMensagem({ tipo: "erro", texto: genericSaveError });
          setSalvando(false);
          return;
        }

        setMensagem({ tipo: "sucesso", texto: "Aluno cadastrado com sucesso." });
        limparFormulario();
        await carregarAlunos();
        setActiveTab("atletas");
      }
    }

    setSalvando(false);
  }

  async function excluirAluno(aluno: Aluno) {
    if (!canManage) {
      setMensagem({ tipo: "erro", texto: "Você não tem permissão para excluir alunos." });
      return;
    }

    const confirmado = window.confirm(`Excluir ${aluno.nome}? Esta ação não pode ser desfeita.`);
    if (!confirmado) return;

    setMensagem(null);
    const { error } = await supabase.from("alunos").delete().eq("id", aluno.id);

    if (error) {
      logClientError("Failed to delete aluno", error);
      setMensagem({ tipo: "erro", texto: genericSaveError });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: "Aluno excluído com sucesso." });
    if (alunoEmEdicao === aluno.id) limparFormulario();
    await carregarAlunos();
  }

  async function analisarGraduacao(id: string, acao: "aprovar" | "recusar") {
    if (!canManage) {
      setMensagem({ tipo: "erro", texto: "Apenas administradores podem analisar graduações." });
      return;
    }

    const fn = acao === "aprovar" ? "aprovar_graduacao_solicitacao" : "recusar_graduacao_solicitacao";
    const { error } = await supabase.rpc(fn, { p_solicitacao_id: id });

    if (error) {
      logClientError("Failed to review graduation request", error);
      setMensagem({ tipo: "erro", texto: genericSaveError });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: acao === "aprovar" ? "Graduação aprovada." : "Graduação recusada." });
    await carregarAlunos();
    await carregarGraduacoesPendentes();
  }

  async function analisarSolicitacaoVencimento(id: string, acao: "aprovar" | "recusar") {
    if (!canManage) {
      setMensagem({ tipo: "erro", texto: "Apenas administradores podem analisar vencimentos." });
      return;
    }

    const fn = acao === "aprovar" ? "aprovar_pagamento_vencimento_solicitacao" : "recusar_pagamento_vencimento_solicitacao";
    const { error } = await supabase.rpc(fn, { p_solicitacao_id: id });

    if (error) {
      logClientError("Failed to review due date request", error);
      setMensagem({ tipo: "erro", texto: genericSaveError });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: acao === "aprovar" ? "Vencimento aprovado." : "Vencimento recusado." });
    await carregarAlunos();
    await carregarSolicitacoesVencimento();
  }

  async function atualizarStatusPagamento(resumo: PagamentoResumo, status: "pago" | "aberto" | "cancelado") {
    if (!canManage) {
      setMensagem({ tipo: "erro", texto: "Apenas administradores podem alterar pagamentos." });
      return;
    }

    setPagamentoEmAtualizacao(resumo.aluno.id);
    setMensagem(null);

    const payload = {
      aluno_id: resumo.aluno.id,
      data_vencimento: resumo.dataVencimento,
      data_pagamento: status === "pago" ? hojeISO() : null,
      status,
      observacoes: resumo.pagamento?.observacoes ?? null,
    };

    const { error: pagamentoError } = resumo.pagamento
      ? await supabase.from("pagamentos").update(payload).eq("id", resumo.pagamento.id)
      : await supabase.from("pagamentos").insert(payload);

    if (pagamentoError) {
      logClientError("Failed to update payment status", pagamentoError);
      setMensagem({ tipo: "erro", texto: genericSaveError });
      setPagamentoEmAtualizacao(null);
      return;
    }

    const { error: alunoError } = await supabase
      .from("alunos")
      .update({ pago: status === "pago" })
      .eq("id", resumo.aluno.id);

    if (alunoError) {
      logClientError("Failed to sync aluno payment flag", alunoError);
      setMensagem({ tipo: "erro", texto: genericSaveError });
      setPagamentoEmAtualizacao(null);
      return;
    }

    setMensagem({ tipo: "sucesso", texto: status === "pago" ? "Pagamento marcado como pago." : status === "aberto" ? "Pagamento marcado como aberto." : "Pagamento cancelado." });
    await carregarAlunos();
    await carregarPagamentos();
    setPagamentoEmAtualizacao(null);
  }

  async function atualizarGrau(id: string) {
    const { error } = await supabase.rpc("atualizar_graduacao_aluno", { p_aluno_id: id });

    if (error) {
      logClientError("Failed to update grau", error);
      setMensagem({ tipo: "erro", texto: genericSaveError });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: "Grau atualizado com sucesso." });
    await carregarAlunos();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="max-w-6xl mx-auto flex flex-col gap-5 mb-8 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-black italic uppercase">ROXBJJ <span className="text-red-600">PLANALTO</span></h2>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-3 text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? "bg-white text-black" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"}`}
            >
              {tab.label}
            </button>
          ))}
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="bg-red-600 p-3 px-5 rounded-2xl text-[10px] font-black uppercase">Sair</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto grid gap-6">
        {mensagem && (
          <div className={`border p-4 rounded-2xl text-sm font-bold ${mensagem.tipo === "sucesso" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {mensagem.texto}
          </div>
        )}

        {activeTab === "cadastro" && (
          canManage ? (
            <AlunoForm
              alunoEmEdicao={alunoEmEdicao}
              canManage={canManage}
              faixas={faixasFormulario}
              form={form}
              salvando={salvando}
              onCancel={limparFormulario}
              onChange={atualizarCampo}
              onSubmit={salvarAluno}
            />
          ) : (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Somente administradores podem cadastrar alunos</div>
          )
        )}

        {activeTab === "atletas" && (
          <>
            <AlunosFilters
              faixas={faixas}
              filtroFaixa={filtroFaixa}
              filtroPagamento={filtroPagamento}
              pesquisa={pesquisa}
              onFiltroFaixaChange={setFiltroFaixa}
              onFiltroPagamentoChange={setFiltroPagamento}
              onPesquisaChange={setPesquisa}
            />

            <section className="grid gap-4">
              {carregando ? (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Carregando atletas...</div>
              ) : alunosPaginados.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum atleta encontrado</div>
              ) : alunosPaginados.map((aluno) => (
                <AlunoCard
                  key={aluno.id}
                  aluno={aluno}
                  graduacaoStatus={statusGraduacao(aluno)}
                  responsavelId={responsaveisPorAluno[aluno.id]}
                  onAtualizarGrau={atualizarGrau}
                  onEditar={canManage ? iniciarEdicao : undefined}
                  onExcluir={canManage ? excluirAluno : undefined}
                />
              ))}
            </section>

            <PaginationControls
              paginaAtual={paginaAtual}
              totalItens={alunosFiltrados.length}
              totalPaginas={totalPaginas}
              onPaginaChange={setPaginaAtual}
            />
          </>
        )}

        {activeTab === "graduacoes" && (
          <section className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
            <div className="mb-5">
              <h3 className="text-lg font-black uppercase italic">Graduações Pendentes</h3>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Solicitações enviadas pelos alunos</p>
            </div>

            {graduacoesPendentes.length === 0 ? (
              <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhuma graduação pendente</div>
            ) : (
              <div className="grid gap-3">
                {graduacoesPendentes.map((solicitacao) => {
                  const aluno = alunosPorId.get(solicitacao.aluno_id);

                  return (
                    <article key={solicitacao.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="font-black uppercase">{aluno?.nome ?? "Aluno não encontrado"}</h4>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {solicitacao.categoria} • Faixa {solicitacao.faixa} • {solicitacao.graus} graus
                        </p>
                        {solicitacao.observacoes && <p className="mt-2 text-xs leading-5 text-zinc-400">{solicitacao.observacoes}</p>}
                        <p className="mt-2 text-[10px] font-bold text-zinc-600">
                          Enviada em {solicitacao.created_at ? new Date(solicitacao.created_at).toLocaleDateString("pt-BR") : "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => analisarGraduacao(solicitacao.id, "aprovar")} disabled={!canManage} className="bg-green-500 text-black disabled:opacity-50 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Aprovar</button>
                        <button onClick={() => analisarGraduacao(solicitacao.id, "recusar")} disabled={!canManage} className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Recusar</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "pagamentos" && (
          <section className="grid gap-6">
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
              <div className="mb-5">
                <h3 className="text-lg font-black uppercase italic">Alterações de vencimento</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Solicitações pendentes para aprovação do admin</p>
              </div>

              {vencimentoSolicitacoes.length === 0 ? (
                <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhuma solicitação pendente</div>
              ) : (
                <div className="grid gap-3">
                  {vencimentoSolicitacoes.map((solicitacao) => {
                    const aluno = alunosPorId.get(solicitacao.aluno_id);

                    return (
                      <article key={solicitacao.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <h4 className="font-black uppercase">{aluno?.nome ?? "Aluno não encontrado"}</h4>
                          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dia {solicitacao.dia_atual} para dia {solicitacao.dia_solicitado}</p>
                          {solicitacao.motivo && <p className="mt-2 text-xs leading-5 text-zinc-400">{solicitacao.motivo}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => analisarSolicitacaoVencimento(solicitacao.id, "aprovar")} disabled={!canManage} className="bg-green-500 text-black disabled:opacity-50 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Aprovar</button>
                          <button onClick={() => analisarSolicitacaoVencimento(solicitacao.id, "recusar")} disabled={!canManage} className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50 p-3 px-5 rounded-2xl text-[9px] font-black uppercase transition-all">Recusar</button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px]">
              <div className="mb-5">
                <h3 className="text-lg font-black uppercase italic">Gestão de pagamentos</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Controle inicial manual</p>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-4">
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Pagos</p>
                  <p className="mt-1 text-2xl font-black text-green-400">{pagamentosResumoContadores.pago}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Em aberto</p>
                  <p className="mt-1 text-2xl font-black text-zinc-200">{pagamentosResumoContadores.aberto + pagamentosResumoContadores.vence_hoje}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Vencidos</p>
                  <p className="mt-1 text-2xl font-black text-red-400">{pagamentosResumoContadores.atrasado}</p>
                </div>
                <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Inadimplentes</p>
                  <p className="mt-1 text-2xl font-black text-red-300">{pagamentosResumoContadores.inadimplente}</p>
                </div>
              </div>

              <div className="grid gap-3">
                {pagamentosResumo.length === 0 ? (
                  <div className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum atleta encontrado</div>
                ) : pagamentosResumo.map((resumo) => {
                  const atualizando = pagamentoEmAtualizacao === resumo.aluno.id;
                  const podeMarcarPago = canManage && resumo.status !== "pago" && resumo.status !== "cancelado";
                  const podeMarcarAberto = canManage && resumo.status !== "aberto" && resumo.status !== "vence_hoje";
                  const podeCancelar = canManage && Boolean(resumo.pagamento) && resumo.status !== "cancelado";

                  return (
                    <article key={resumo.aluno.id} className="bg-zinc-950 border border-zinc-800 p-5 rounded-2xl grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto] xl:items-center">
                      <div>
                        <h4 className="font-black uppercase">{resumo.aluno.nome}</h4>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dia de vencimento: {diaPagamentoAluno(resumo.aluno)}</p>
                      </div>
                      <div className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        <span>Vencimento atual: {formatarData(resumo.dataVencimento)}</span>
                        <span>Valor: {formatarValor(resumo.pagamento?.valor)}</span>
                      </div>
                      <div className="grid gap-2">
                        <span className={`w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase ${pagamentoStatusClass[resumo.status]}`}>
                          {textoStatusPagamento(resumo)}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Dias em atraso: {resumo.diasEmAtraso}</span>
                      </div>
                      <div className="grid gap-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                        <span>Último pagamento: {formatarData(resumo.pagamento?.data_pagamento)}</span>
                        <span className="normal-case tracking-normal text-xs font-medium text-zinc-400">{resumo.pagamento?.observacoes ?? "Sem observação"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button onClick={() => atualizarStatusPagamento(resumo, "pago")} disabled={!podeMarcarPago || atualizando} className="bg-green-500 text-black disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Pago</button>
                        <button onClick={() => atualizarStatusPagamento(resumo, "aberto")} disabled={!podeMarcarAberto || atualizando} className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Aberto</button>
                        <button onClick={() => atualizarStatusPagamento(resumo, "cancelado")} disabled={!podeCancelar || atualizando} className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-40 p-3 px-4 rounded-2xl text-[9px] font-black uppercase transition-all">Cancelar</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
