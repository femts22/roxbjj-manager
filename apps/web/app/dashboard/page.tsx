"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlunoCard } from "@/components/dashboard/AlunoCard";
import { AlunoForm, type AlunoFormValues } from "@/components/dashboard/AlunoForm";
import { AlunosFilters, type FiltroPagamento } from "@/components/dashboard/AlunosFilters";
import { PaginationControls } from "@/components/dashboard/PaginationControls";
import { supabase } from "@/lib/supabase";
import type { Aluno, AlunoInsert, AlunoUpdate, Faixa } from "@/lib/types";

type Mensagem = {
  tipo: "sucesso" | "erro";
  texto: string;
};

const alunosColumns = "id,nome,email,faixa,grau,pago,vencimento,presencas";
const faixas: Faixa[] = ["branca", "azul", "roxa", "marrom", "preta"];
const itensPorPagina = 6;

const formInicial: AlunoFormValues = {
  nome: "",
  email: "",
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
  const nome = form.nome.trim();
  const email = form.email.trim();
  const grau = Number(form.grau);
  const vencimento = Number(form.vencimento);
  const presencas = Number(form.presencas);

  if (nome.length < 3) return "Informe um nome com pelo menos 3 caracteres.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Informe um e-mail válido.";
  if (!Number.isInteger(grau) || grau < 0 || grau > 4) return "O grau deve estar entre 0 e 4.";
  if (!Number.isInteger(vencimento) || vencimento < 1 || vencimento > 31) return "O vencimento deve estar entre 1 e 31.";
  if (!Number.isInteger(presencas) || presencas < 0) return "As presenças devem ser um número inteiro positivo.";

  return null;
}

function montarPayload(form: AlunoFormValues): AlunoInsert {
  return {
    nome: form.nome.trim(),
    email: form.email.trim().toLowerCase(),
    faixa: form.faixa,
    grau: Number(form.grau),
    pago: form.pago,
    vencimento: Number(form.vencimento),
    presencas: Number(form.presencas),
  };
}

function alunoParaForm(aluno: Aluno): AlunoFormValues {
  return {
    nome: aluno.nome,
    email: aluno.email,
    faixa: aluno.faixa,
    grau: String(aluno.grau),
    pago: aluno.pago,
    vencimento: String(aluno.vencimento),
    presencas: String(aluno.presencas ?? 0),
  };
}

export default function DashboardAdmin() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [form, setForm] = useState<AlunoFormValues>(formInicial);
  const [alunoEmEdicao, setAlunoEmEdicao] = useState<string | null>(null);
  const [filtroPagamento, setFiltroPagamento] = useState<FiltroPagamento>("todos");
  const [filtroFaixa, setFiltroFaixa] = useState<Faixa | "todas">("todas");
  const [pesquisa, setPesquisa] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<Mensagem | null>(null);
  const router = useRouter();

  async function carregarAlunos() {
    setCarregando(true);

    const { data, error } = await supabase
      .from("alunos")
      .select(alunosColumns)
      .order("nome", { ascending: true });

    if (error) {
      setMensagem({ tipo: "erro", texto: `Erro ao carregar alunos: ${error.message}` });
      setAlunos([]);
    } else {
      setAlunos(data ?? []);
    }

    setCarregando(false);
  }

  useEffect(() => {
    void carregarAlunos();
  }, []);

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
    setForm(alunoParaForm(aluno));
    setAlunoEmEdicao(aluno.id);
    setMensagem(null);
  }

  async function salvarAluno(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        setMensagem({ tipo: "erro", texto: `Erro ao editar aluno: ${error.message}` });
      } else {
        setMensagem({ tipo: "sucesso", texto: "Aluno atualizado com sucesso." });
        limparFormulario();
        await carregarAlunos();
      }
    } else {
      const payload = montarPayload(form);
      const { error } = await supabase.from("alunos").insert(payload);

      if (error) {
        setMensagem({ tipo: "erro", texto: `Erro ao cadastrar aluno: ${error.message}` });
      } else {
        setMensagem({ tipo: "sucesso", texto: "Aluno cadastrado com sucesso." });
        limparFormulario();
        await carregarAlunos();
      }
    }

    setSalvando(false);
  }

  async function excluirAluno(aluno: Aluno) {
    const confirmado = window.confirm(`Excluir ${aluno.nome}? Esta ação não pode ser desfeita.`);
    if (!confirmado) return;

    setMensagem(null);
    const { error } = await supabase.from("alunos").delete().eq("id", aluno.id);

    if (error) {
      setMensagem({ tipo: "erro", texto: `Erro ao excluir aluno: ${error.message}` });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: "Aluno excluído com sucesso." });
    if (alunoEmEdicao === aluno.id) limparFormulario();
    await carregarAlunos();
  }

  async function atualizarGrau(id: string, atual: number) {
    const novo = atual >= 4 ? 0 : atual + 1;
    const { error } = await supabase.from("alunos").update({ grau: novo }).eq("id", id);

    if (error) {
      setMensagem({ tipo: "erro", texto: `Erro ao atualizar grau: ${error.message}` });
      return;
    }

    setMensagem({ tipo: "sucesso", texto: "Grau atualizado com sucesso." });
    await carregarAlunos();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <header className="max-w-5xl mx-auto flex justify-between items-center mb-10">
        <h2 className="text-2xl font-black italic uppercase">Mestre<span className="text-red-600">ROXBJJ</span></h2>
        <div className="flex gap-4">
          <button onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="bg-red-600 p-2 px-6 rounded-full text-[10px] font-black uppercase">Sair</button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid gap-6">
        <AlunoForm
          alunoEmEdicao={alunoEmEdicao}
          faixas={faixas}
          form={form}
          salvando={salvando}
          onCancel={limparFormulario}
          onChange={atualizarCampo}
          onSubmit={salvarAluno}
        />

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
              onAtualizarGrau={atualizarGrau}
              onEditar={iniciarEdicao}
              onExcluir={excluirAluno}
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
