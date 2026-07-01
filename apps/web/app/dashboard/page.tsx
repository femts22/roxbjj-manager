"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlunoCard } from "@/components/dashboard/AlunoCard";
import { AlunoForm, type AlunoFormValues } from "@/components/dashboard/AlunoForm";
import { AlunosFilters, type FiltroPagamento } from "@/components/dashboard/AlunosFilters";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { canAccessDashboard, canManageAlunos, genericLoadError, genericSaveError, getCurrentProfile, getHomeRouteForRole, logClientError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import type { Aluno, AlunoInsert, AlunoUpdate, AppRole, Faixa } from "@/lib/types";

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

const alunosColumns = "id,user_id,nome,email,faixa,grau,pago,vencimento,presencas,telefone,data_nascimento,observacoes";
const faixas: Faixa[] = ["branca", "azul", "roxa", "marrom", "preta"];
const itensPorPagina = 6;

const formInicial: AlunoFormValues = {
  user_id: "",
  responsavel_user_id: "",
  nome: "",
  email: "",
  telefone: "",
  data_nascimento: "",
  observacoes: "",
  faixa: "branca",
  grau: "0",
  pago: false,
  vencimento: "10",
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
  if (!Number.isInteger(grau) || grau < 0 || grau > 4) return "O grau deve estar entre 0 e 4.";
  if (!Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) return "O vencimento deve estar entre 1 e 31.";
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
    faixa: form.faixa,
    grau: Number(form.grau),
    pago: form.pago,
    vencimento: Number(form.vencimento),
    presencas: Number(form.presencas),
  };
}

function alunoParaForm(aluno: Aluno, responsavelId?: string): AlunoFormValues {
  return {
    user_id: aluno.user_id ?? "",
    responsavel_user_id: responsavelId ?? "",
    nome: aluno.nome,
    email: aluno.email,
    telefone: aluno.telefone ?? "",
    data_nascimento: aluno.data_nascimento ?? "",
    observacoes: aluno.observacoes ?? "",
    faixa: aluno.faixa,
    grau: String(aluno.grau),
    pago: aluno.pago,
    vencimento: String(aluno.vencimento),
    presencas: String(aluno.presencas ?? 0),
  };
}

export default function DashboardAdmin() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [responsaveisPorAluno, setResponsaveisPorAluno] = useState<Record<string, string>>({});
  const [form, setForm] = useState<AlunoFormValues>(formInicial);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState<string | null>(null);
  const [filtroPagamento, setFiltroPagamento] = useState<FiltroPagamento>("todos");
  const [filtroFaixa, setFiltroFaixa] = useState<Faixa | "todas">("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const router = useRouter();
  const canManage = canManageAlunos(role);

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
    }

    void inicializar();

    return () => {
      ativo = false;
    };
  }, [router]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [filtroPagamento, filtroFaixa, pesquisa]);

  const alunosFiltrados = useMemo(() => {
    const diaAtual = new Date().getDate();
    const termo = normalizarTexto(pesquisa);

    return alunos.filter((aluno) => {
      const passaPagamento =
        filtroPagamento === "todos" ||
        (filtroPagamento === "pagos" && aluno.pago) ||
        (filtroPagamento === "pendentes" && !aluno.pago && aluno.vencimento < diaAtual);

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

  function atualizarCampo<K extends keyof AlunoFormValues>(campo: K, valor: AlunoFormValues[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function limparFormulario() {
    setForm(formInicial);
    setAlunoEmEdicao(null);
  }

  function iniciarEdicao(aluno: Aluno) {
    setForm(alunoParaForm(aluno, responsaveisPorAluno[aluno.id]));
    setAlunoEmEdicao(aluno.id);
    setMensagem(null);
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
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black italic uppercase">ROXBJJ <span className="text-red-600">PLANALTO</span></h2>
        <div className="flex gap-4">
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="bg-red-600 p-2 px-6 rounded-full text-[10px] font-black uppercase">Sair</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-6">
        {canManage && (
          <AlunoForm
            alunoEmEdicao={alunoEmEdicao}
            canManage={canManage}
            faixas={faixas}
            form={form}
            salvando={salvando}
            onCancel={limparFormulario}
            onChange={atualizarCampo}
            onSubmit={salvarAluno}
          />
        )}

        <AlunosFilters
          faixas={faixas}
          filtroFaixa={filtroFaixa}
          filtroPagamento={filtroPagamento}
          pesquisa={pesquisa}
          onFiltroFaixaChange={setFiltroFaixa}
          onFiltroPagamentoChange={setFiltroPagamento}
          onPesquisaChange={setPesquisa}
        />

        {mensagem && (
          <div className={`border p-4 rounded-2xl text-sm font-bold ${mensagem.tipo === "sucesso" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-red-500/10 border-red-500/30 text-red-400"}`}>
            {mensagem.texto}
          </div>
        )}

        <section className="grid gap-4">
          {carregando ? (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Carregando atletas...</div>
          ) : alunosPaginados.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[32px] text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">Nenhum atleta encontrado</div>
          ) : alunosPaginados.map((aluno) => (
            <AlunoCard
              key={aluno.id}
              aluno={aluno}
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
      </main>
    </div>
  );
}
