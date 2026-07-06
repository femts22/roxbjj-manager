"use client";
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { genericLoadError, genericSaveError, getCurrentProfile, getHomeRouteForRole, logClientError } from '@/lib/auth';
import { calcularResumoCobranca, formatarData, formatarValor, textoStatusFinanceiro } from '@/lib/financeiro';
import { categoriasGraduacao, faixaCompativelComCategoria, faixasPorCategoria } from '@/lib/graduacao';
import { supabase } from '@/lib/supabase';
import type { Aluno, AlunoEvento, AlunoObservacao, CategoriaGraduacao, FaixaGraduacao, GraduacaoSolicitacao, Pagamento } from '@/lib/types';

const alunoColumns = 'id,user_id,nome,email,categoria,faixa,grau,graus,graduacao_aprovada,pago,vencimento,dia_vencimento_pagamento,presencas,telefone,data_nascimento,observacoes,nome_social,cpf,rg,whatsapp,cep,rua,numero,complemento,bairro,cidade,estado,contato_emergencia_nome,contato_emergencia_telefone,contato_emergencia_parentesco,tipo_sanguineo,alergias,restricoes_medicas,medicamentos_uso_continuo,observacoes_medicas,responsavel_principal_nome,responsavel_principal_telefone,responsavel_principal_whatsapp,responsavel_principal_email,responsavel_principal_parentesco,cadastro_completo,cadastro_atualizado_em';
const graduacaoSolicitacoesColumns = 'id,aluno_id,user_id,categoria,faixa,graus,data_ultima_graduacao,academia_origem,professor_graduador,observacoes,status,analisado_por,analisado_em,created_at,updated_at';
const pagamentosColumns = "id,aluno_id,valor,data_vencimento,data_pagamento,status,observacoes,created_at,updated_at";
const observacoesColumns = "id,aluno_id,autor_id,tipo,visibilidade,conteudo,created_at,updated_at";
const eventosColumns = "id,aluno_id,tipo,titulo,descricao,criado_por,created_at";

type GraduacaoForm = {
  categoria: CategoriaGraduacao;
  faixa: FaixaGraduacao;
  graus: string;
  data_ultima_graduacao: string;
  academia_origem: string;
  professor_graduador: string;
  observacoes: string;
};


type CadastroForm = {
  nome: string;
  nome_social: string;
  cpf: string;
  rg: string;
  data_nascimento: string;
  telefone: string;
  whatsapp: string;
  email: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  contato_emergencia_nome: string;
  contato_emergencia_telefone: string;
  contato_emergencia_parentesco: string;
  tipo_sanguineo: string;
  alergias: string;
  restricoes_medicas: string;
  medicamentos_uso_continuo: string;
  observacoes_medicas: string;
  responsavel_principal_nome: string;
  responsavel_principal_telefone: string;
  responsavel_principal_whatsapp: string;
  responsavel_principal_email: string;
  responsavel_principal_parentesco: string;
  observacoes: string;
};

const cadastroCampos = [
  ["Dados pessoais", [["nome", "Nome completo"], ["nome_social", "Nome social/apelido"], ["cpf", "CPF"], ["rg", "RG"], ["data_nascimento", "Data de nascimento", "date"]]],
  ["Contato e endereço", [["telefone", "Telefone"], ["whatsapp", "WhatsApp"], ["email", "E-mail", "email"], ["cep", "CEP"], ["rua", "Rua"], ["numero", "Número"], ["complemento", "Complemento"], ["bairro", "Bairro"], ["cidade", "Cidade"], ["estado", "Estado"]]],
  ["Emergência e saúde", [["contato_emergencia_nome", "Contato de emergência"], ["contato_emergencia_telefone", "Telefone de emergência"], ["contato_emergencia_parentesco", "Grau de parentesco"], ["tipo_sanguineo", "Tipo sanguíneo"], ["alergias", "Alergias", "textarea"], ["restricoes_medicas", "Restrições médicas", "textarea"], ["medicamentos_uso_continuo", "Medicamentos de uso contínuo"], ["observacoes_medicas", "Observações médicas", "textarea"]]],
  ["Responsável principal", [["responsavel_principal_nome", "Nome"], ["responsavel_principal_telefone", "Telefone"], ["responsavel_principal_whatsapp", "WhatsApp"], ["responsavel_principal_email", "E-mail", "email"], ["responsavel_principal_parentesco", "Grau de parentesco"], ["observacoes", "Observações do aluno", "textarea"]]],
] as const;

const cadastroFormInicial: CadastroForm = {
  nome: "", nome_social: "", cpf: "", rg: "", data_nascimento: "", telefone: "", whatsapp: "", email: "", cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "",
  contato_emergencia_nome: "", contato_emergencia_telefone: "", contato_emergencia_parentesco: "", tipo_sanguineo: "", alergias: "", restricoes_medicas: "", medicamentos_uso_continuo: "", observacoes_medicas: "",
  responsavel_principal_nome: "", responsavel_principal_telefone: "", responsavel_principal_whatsapp: "", responsavel_principal_email: "", responsavel_principal_parentesco: "", observacoes: "",
};

function texto(valor?: string | null) { return valor ?? ""; }
function valorOuNull(valor: string) { const limpo = valor.trim(); return limpo ? limpo : null; }
function cadastroMinimoCompleto(form: CadastroForm) { return Boolean(form.nome.trim() && (form.telefone.trim() || form.whatsapp.trim()) && form.data_nascimento && form.contato_emergencia_nome.trim() && form.contato_emergencia_telefone.trim() && form.cep.trim() && form.rua.trim() && form.numero.trim() && form.bairro.trim() && form.cidade.trim() && form.estado.trim()); }

function alunoParaCadastroForm(aluno: Aluno): CadastroForm {
  return {
    nome: texto(aluno.nome), nome_social: texto(aluno.nome_social), cpf: texto(aluno.cpf), rg: texto(aluno.rg), data_nascimento: texto(aluno.data_nascimento), telefone: texto(aluno.telefone), whatsapp: texto(aluno.whatsapp), email: texto(aluno.email), cep: texto(aluno.cep), rua: texto(aluno.rua), numero: texto(aluno.numero), complemento: texto(aluno.complemento), bairro: texto(aluno.bairro), cidade: texto(aluno.cidade), estado: texto(aluno.estado),
    contato_emergencia_nome: texto(aluno.contato_emergencia_nome), contato_emergencia_telefone: texto(aluno.contato_emergencia_telefone), contato_emergencia_parentesco: texto(aluno.contato_emergencia_parentesco), tipo_sanguineo: texto(aluno.tipo_sanguineo), alergias: texto(aluno.alergias), restricoes_medicas: texto(aluno.restricoes_medicas), medicamentos_uso_continuo: texto(aluno.medicamentos_uso_continuo), observacoes_medicas: texto(aluno.observacoes_medicas),
    responsavel_principal_nome: texto(aluno.responsavel_principal_nome), responsavel_principal_telefone: texto(aluno.responsavel_principal_telefone), responsavel_principal_whatsapp: texto(aluno.responsavel_principal_whatsapp), responsavel_principal_email: texto(aluno.responsavel_principal_email), responsavel_principal_parentesco: texto(aluno.responsavel_principal_parentesco), observacoes: texto(aluno.observacoes),
  };
}
const graduacaoFormInicial: GraduacaoForm = {
  categoria: "adulto",
  faixa: "branca",
  graus: "0",
  data_ultima_graduacao: "",
  academia_origem: "",
  professor_graduador: "",
  observacoes: "",
};

export default function AreaAluno() {
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [solicitacaoPendente, setSolicitacaoPendente] = useState<GraduacaoSolicitacao | null>(null);
  const [pagamentos, setPagamentos] = useState<Pagamento[]>([]);
  const [observacoesAluno, setObservacoesAluno] = useState<AlunoObservacao[]>([]);
  const [eventosAluno, setEventosAluno] = useState<AlunoEvento[]>([]);
  const [graduacaoForm, setGraduacaoForm] = useState<GraduacaoForm>(graduacaoFormInicial);
  const [cadastroForm, setCadastroForm] = useState<CadastroForm>(cadastroFormInicial);
  const [carregando, setCarregando] = useState(true);
  const [salvandoGraduacao, setSalvandoGraduacao] = useState(false);
  const [salvandoCadastro, setSalvandoCadastro] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagemGraduacao, setMensagemGraduacao] = useState<string | null>(null);
  const [mensagemCadastro, setMensagemCadastro] = useState<string | null>(null);
  const router = useRouter();

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro(null);

    const profile = await getCurrentProfile();
    if (!profile) return router.push('/');

    if (profile.role !== "aluno") {
      return router.replace(getHomeRouteForRole(profile.role));
    }

    const { data, error } = await supabase.from('alunos').select(alunoColumns).eq('user_id', profile.id).maybeSingle();
    if (error) {
      logClientError("Failed to load student area", error);
      setErro(genericLoadError);
      setCarregando(false);
      return;
    }

    setAluno(data ?? null);

    if (data) {
      setCadastroForm(alunoParaCadastroForm(data));
      setGraduacaoForm((atual) => ({
        ...atual,
        categoria: data.categoria ?? "adulto",
        faixa: faixaCompativelComCategoria(data.categoria ?? "adulto", data.faixa) ? data.faixa : "branca",
        graus: String(data.graus ?? data.grau ?? 0),
      }));

      const { data: solicitacao, error: solicitacaoError } = await supabase
        .from('graduacao_solicitacoes')
        .select(graduacaoSolicitacoesColumns)
        .eq('aluno_id', data.id)
        .eq('status', 'pendente')
        .maybeSingle();

      if (solicitacaoError) {
        logClientError("Failed to load pending graduation request", solicitacaoError);
      }

      setSolicitacaoPendente(solicitacao ?? null);

      const [pagamentosResult, observacoesResult, eventosResult] = await Promise.all([
        supabase.from("pagamentos").select(pagamentosColumns).eq("aluno_id", data.id).order("data_vencimento", { ascending: false }),
        supabase.from("aluno_observacoes").select(observacoesColumns).eq("aluno_id", data.id).eq("visibilidade", "aluno").order("created_at", { ascending: false }),
        supabase.from("aluno_eventos").select(eventosColumns).eq("aluno_id", data.id).order("created_at", { ascending: false }).limit(8),
      ]);

      if (pagamentosResult.error) logClientError("Failed to load student payments", pagamentosResult.error);
      if (observacoesResult.error) logClientError("Failed to load student notes", observacoesResult.error);
      if (eventosResult.error) logClientError("Failed to load student events", eventosResult.error);

      setPagamentos(pagamentosResult.data ?? []);
      setObservacoesAluno(observacoesResult.data ?? []);
      setEventosAluno(eventosResult.data ?? []);
    }

    setCarregando(false);
  }, [router]);

  useEffect(() => { void carregarDados(); }, [carregarDados]);

  async function handleCheckIn() {
    if (!aluno) return;
    const { error } = await supabase.rpc('registrar_presenca');

    if (error) {
      logClientError("Failed to register attendance", error);
      setErro(genericSaveError);
      return;
    }

    alert("Check-in efetuado! Bom treino!");
    await carregarDados();
  }


  function atualizarCadastro<K extends keyof CadastroForm>(campo: K, valor: CadastroForm[K]) {
    setCadastroForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function salvarCadastro(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aluno) return;

    if (!cadastroForm.nome.trim()) {
      setMensagemCadastro("Informe seu nome completo.");
      return;
    }

    setSalvandoCadastro(true);
    setMensagemCadastro(null);

    const { error } = await supabase.rpc("atualizar_cadastro_aluno", {
      p_nome: cadastroForm.nome.trim(),
      p_nome_social: valorOuNull(cadastroForm.nome_social),
      p_cpf: valorOuNull(cadastroForm.cpf),
      p_rg: valorOuNull(cadastroForm.rg),
      p_data_nascimento: valorOuNull(cadastroForm.data_nascimento),
      p_telefone: valorOuNull(cadastroForm.telefone),
      p_whatsapp: valorOuNull(cadastroForm.whatsapp),
      p_email: cadastroForm.email.trim(),
      p_cep: valorOuNull(cadastroForm.cep),
      p_rua: valorOuNull(cadastroForm.rua),
      p_numero: valorOuNull(cadastroForm.numero),
      p_complemento: valorOuNull(cadastroForm.complemento),
      p_bairro: valorOuNull(cadastroForm.bairro),
      p_cidade: valorOuNull(cadastroForm.cidade),
      p_estado: valorOuNull(cadastroForm.estado),
      p_contato_emergencia_nome: valorOuNull(cadastroForm.contato_emergencia_nome),
      p_contato_emergencia_telefone: valorOuNull(cadastroForm.contato_emergencia_telefone),
      p_contato_emergencia_parentesco: valorOuNull(cadastroForm.contato_emergencia_parentesco),
      p_tipo_sanguineo: valorOuNull(cadastroForm.tipo_sanguineo),
      p_alergias: valorOuNull(cadastroForm.alergias),
      p_restricoes_medicas: valorOuNull(cadastroForm.restricoes_medicas),
      p_medicamentos_uso_continuo: valorOuNull(cadastroForm.medicamentos_uso_continuo),
      p_observacoes_medicas: valorOuNull(cadastroForm.observacoes_medicas),
      p_responsavel_principal_nome: valorOuNull(cadastroForm.responsavel_principal_nome),
      p_responsavel_principal_telefone: valorOuNull(cadastroForm.responsavel_principal_telefone),
      p_responsavel_principal_whatsapp: valorOuNull(cadastroForm.responsavel_principal_whatsapp),
      p_responsavel_principal_email: valorOuNull(cadastroForm.responsavel_principal_email),
      p_responsavel_principal_parentesco: valorOuNull(cadastroForm.responsavel_principal_parentesco),
      p_observacoes: valorOuNull(cadastroForm.observacoes),
    });

    if (error) {
      logClientError("Failed to update student profile", error);
      setMensagemCadastro(genericSaveError);
      setSalvandoCadastro(false);
      return;
    }

    setMensagemCadastro(cadastroMinimoCompleto(cadastroForm) ? "Cadastro salvo com sucesso." : "Cadastro salvo. Ainda faltam informações obrigatórias.");
    await carregarDados();
    setSalvandoCadastro(false);
  }
  function atualizarGraduacao<K extends keyof GraduacaoForm>(campo: K, valor: GraduacaoForm[K]) {
    setGraduacaoForm((atual) => {
      if (campo === "categoria") {
        const categoria = valor as CategoriaGraduacao;
        const faixaAtual = faixaCompativelComCategoria(categoria, atual.faixa) ? atual.faixa : faixasPorCategoria[categoria][0];
        return { ...atual, categoria, faixa: faixaAtual };
      }

      return { ...atual, [campo]: valor };
    });
  }

  function validarGraduacao() {
    const graus = Number(graduacaoForm.graus);

    if (!categoriasGraduacao.includes(graduacaoForm.categoria)) return "Informe uma categoria válida.";
    if (!faixaCompativelComCategoria(graduacaoForm.categoria, graduacaoForm.faixa)) return "A faixa deve ser compatível com a categoria.";
    if (!Number.isInteger(graus) || graus < 0 || graus > 4) return "Os graus devem estar entre 0 e 4.";
    return null;
  }

  async function enviarSolicitacaoGraduacao(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!aluno || solicitacaoPendente || aluno.graduacao_aprovada) return;

    const erroValidacao = validarGraduacao();
    if (erroValidacao) {
      setMensagemGraduacao(erroValidacao);
      return;
    }

    setSalvandoGraduacao(true);
    setMensagemGraduacao(null);

    const { error } = await supabase.from('graduacao_solicitacoes').insert({
      aluno_id: aluno.id,
      user_id: aluno.user_id,
      categoria: graduacaoForm.categoria,
      faixa: graduacaoForm.faixa,
      graus: Number(graduacaoForm.graus),
      data_ultima_graduacao: graduacaoForm.data_ultima_graduacao || null,
      academia_origem: graduacaoForm.academia_origem.trim() || null,
      professor_graduador: graduacaoForm.professor_graduador.trim() || null,
      observacoes: graduacaoForm.observacoes.trim() || null,
    });

    if (error) {
      logClientError("Failed to create graduation request", error);
      setMensagemGraduacao(genericSaveError);
      setSalvandoGraduacao(false);
      return;
    }

    setMensagemGraduacao("Graduação enviada com sucesso. A administração vai analisar e atualizar sua ficha.");
    await carregarDados();
    setSalvandoGraduacao(false);
  }

  if (carregando) {
    return <div className="min-h-dvh bg-black text-white flex items-center justify-center font-black uppercase italic animate-pulse">Carregando sua área...</div>;
  }

  if (!aluno) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-white p-4 sm:p-6">
        <main className="max-w-md mx-auto min-h-[calc(100vh-3rem)] flex flex-col justify-center gap-6">
          <header className="flex justify-between items-center">
            <h2 className="text-xl font-black italic tracking-tighter">ROXBJJ <span className="text-red-600">PLANALTO</span></h2>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="bg-zinc-900 p-2 px-4 rounded-full text-[10px] font-black border border-zinc-800">SAIR</button>
          </header>

          <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] p-6 space-y-3">
            <h1 className="text-2xl font-black uppercase italic">Cadastro criado</h1>
            <p className="text-sm leading-6 text-zinc-300">
              Seu cadastro foi criado. A equipe da ROXBJJ PLANALTO poderá complementar seus dados.
            </p>
            {erro && <p className="text-sm font-bold text-red-400">{erro}</p>}
          </section>
        </main>
      </div>
    );
  }

  const cadastroCompleto = aluno.cadastro_completo || cadastroMinimoCompleto(cadastroForm);
  const cobrancas = pagamentos.map((pagamento) => calcularResumoCobranca(aluno, pagamento));
  const valorEmAberto = cobrancas
    .filter((cobranca) => cobranca.status === "aberto" || cobranca.status === "vence_hoje")
    .reduce((total, cobranca) => total + cobranca.valor, 0);
  const valorVencido = cobrancas
    .filter((cobranca) => cobranca.status === "vencido" || cobranca.status === "inadimplente")
    .reduce((total, cobranca) => total + cobranca.valor, 0);

  return (
    <div className="min-h-dvh bg-zinc-950 text-white p-4 pb-10 sm:p-6 sm:pb-12">
      <div className="max-w-md mx-auto space-y-5 sm:space-y-6">
        <header className="flex justify-between items-center py-4">
          <h2 className="text-xl font-black italic tracking-tighter">ROXBJJ <span className="text-red-600">PLANALTO</span></h2>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/'))} className="bg-zinc-900 p-2 px-4 rounded-full text-[10px] font-black border border-zinc-800">SAIR</button>
        </header>

        {/* BOX GRADUAÇÃO */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl">
          <p className="text-[10px] font-black uppercase tracking-widest text-red-400">Sobre o Beta</p>
          <h2 className="mt-2 text-xl font-black uppercase italic">ROXBJJ PLANALTO Beta 1.0</h2>
          <p className="mt-3 text-xs font-bold leading-5 text-zinc-400">Esta versão está em testes com usuários reais. Se encontrar erro, dificuldade ou tiver sugestão, envie para a administração.</p>
        </section>


        {!cadastroCompleto && (
          <div className="rounded-3xl border border-yellow-400/30 bg-yellow-400/10 p-5 text-sm font-bold leading-6 text-yellow-100">
            Complete seu cadastro para que a equipe tenha todas as informações necessárias.
          </div>
        )}

        <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-2xl font-black uppercase italic">Meu cadastro</h2>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Dados completos do aluno</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-[9px] font-black uppercase ${cadastroCompleto ? "bg-green-500 text-black" : "bg-yellow-400 text-black"}`}>
              {cadastroCompleto ? "Cadastro completo" : "Cadastro incompleto"}
            </span>
          </div>

          <form onSubmit={salvarCadastro} className="grid gap-6">
            {cadastroCampos.map(([grupo, campos]) => (
              <fieldset key={grupo} className="grid gap-3">
                <legend className="mb-1 text-sm font-black uppercase italic text-zinc-200">{grupo}</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {campos.map(([campo, label, tipo]) => {
                    const nomeCampo = campo as keyof CadastroForm;
                    const comum = "w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-sm outline-none focus:border-red-600";

                    return (
                      <label key={campo} className={tipo === "textarea" ? "grid gap-1 sm:col-span-2" : "grid gap-1"}>
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
                        {tipo === "textarea" ? (
                          <textarea value={cadastroForm[nomeCampo]} onChange={(event) => atualizarCadastro(nomeCampo, event.target.value)} className={`${comum} min-h-20 resize-none`} />
                        ) : (
                          <input type={tipo ?? "text"} value={cadastroForm[nomeCampo]} onChange={(event) => atualizarCadastro(nomeCampo, nomeCampo === "estado" ? event.target.value.toUpperCase() : event.target.value)} className={comum} maxLength={nomeCampo === "estado" ? 2 : undefined} />
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            {mensagemCadastro && <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-xs font-bold text-zinc-300">{mensagemCadastro}</div>}

            <button disabled={salvandoCadastro} className="rounded-2xl bg-red-600 p-4 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-red-700 disabled:opacity-50">
              {salvandoCadastro ? "Salvando..." : "Salvar meu cadastro"}
            </button>
          </form>
        </section>
        <div className="bg-zinc-900 border border-zinc-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl">
          <div className="mb-6">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Aluno</p>
            <h1 className="text-2xl font-black uppercase italic">{aluno.nome}</h1>
            <p className="mt-1 text-[10px] font-bold text-zinc-500">{aluno.email}</p>
            {aluno.telefone && <p className="mt-1 text-[10px] font-bold text-zinc-500">{aluno.telefone}</p>}
          </div>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Graduação Atual</p>
          <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-end sm:justify-between">
            <h3 className="text-2xl sm:text-4xl font-black italic uppercase">Faixa {aluno.faixa}</h3>
            <span className="text-zinc-500 font-black text-xs italic">{aluno.graus ?? aluno.grau ?? 0} GRAUS</span>
          </div>
          <p className="mb-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria {aluno.categoria}</p>
          
          <div className="flex gap-1 h-10 w-full bg-zinc-800 rounded-xl overflow-hidden border-2 border-black shadow-inner">
             <div className={`flex-1 ${aluno.faixa.toLowerCase() === 'branca' ? 'bg-zinc-200' : aluno.faixa.toLowerCase() === 'azul' ? 'bg-blue-600' : 'bg-purple-700'}`} />
             <div className="w-16 bg-black flex items-center justify-center gap-1 px-1">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className={`h-6 w-1.5 rounded-full ${i < (aluno.graus ?? aluno.grau ?? 0) ? 'bg-white shadow-[0_0_8px_white]' : 'bg-zinc-800'}`} />
                ))}
             </div>
             <div className={`w-3 ${aluno.faixa.toLowerCase() === 'branca' ? 'bg-zinc-200' : aluno.faixa.toLowerCase() === 'azul' ? 'bg-blue-600' : 'bg-purple-700'}`} />
          </div>

          <p className="mt-6 text-xs font-bold leading-5 text-zinc-400">
            Seu cadastro foi criado. A equipe da ROXBJJ PLANALTO poderá complementar seus dados.
          </p>
        </div>

        <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-2xl font-black uppercase italic">Minha Graduação</h2>
            <p className="mt-1 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Graduação oficial</p>
          </div>

          {aluno.graduacao_aprovada ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Graduação aprovada</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Categoria</p>
                  <p className="mt-1 text-sm font-black uppercase">{aluno.categoria}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Faixa</p>
                  <p className="mt-1 text-sm font-black uppercase">{aluno.faixa}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Graus</p>
                  <p className="mt-1 text-sm font-black">{aluno.graus ?? aluno.grau ?? 0}</p>
                </div>
              </div>
              <p className="text-xs leading-5 text-zinc-400">
                Sua graduação já foi aprovada. Novas alterações de grau ou faixa serão feitas pela equipe da ROXBJJ PLANALTO.
              </p>
            </div>
          ) : solicitacaoPendente ? (
            <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-5 space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">Em análise</p>
              <p className="text-sm font-bold uppercase">Categoria {solicitacaoPendente.categoria} • Faixa {solicitacaoPendente.faixa} • {solicitacaoPendente.graus} graus</p>
              <p className="text-xs leading-5 text-zinc-400">Sua graduação foi enviada para análise da administração.</p>
            </div>
          ) : (
            <form onSubmit={enviarSolicitacaoGraduacao} className="grid gap-3">
              <select value={graduacaoForm.categoria} onChange={(event) => atualizarGraduacao("categoria", event.target.value as CategoriaGraduacao)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none">
                <option value="infantil">Infantil</option>
                <option value="juvenil">Juvenil</option>
                <option value="adulto">Adulto</option>
              </select>

              <div className="grid grid-cols-2 gap-3">
                <select value={graduacaoForm.faixa} onChange={(event) => atualizarGraduacao("faixa", event.target.value as FaixaGraduacao)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none">
                  {faixasPorCategoria[graduacaoForm.categoria].map((faixa) => <option key={faixa} value={faixa}>Faixa {faixa}</option>)}
                </select>
                <input type="number" min={0} max={4} value={graduacaoForm.graus} onChange={(event) => atualizarGraduacao("graus", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Graus" />
              </div>

              <input type="date" value={graduacaoForm.data_ultima_graduacao} onChange={(event) => atualizarGraduacao("data_ultima_graduacao", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" aria-label="Data da última graduação" />
              <input value={graduacaoForm.academia_origem} onChange={(event) => atualizarGraduacao("academia_origem", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Academia de origem" />
              <input value={graduacaoForm.professor_graduador} onChange={(event) => atualizarGraduacao("professor_graduador", event.target.value)} className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Professor que graduou" />
              <textarea value={graduacaoForm.observacoes} onChange={(event) => atualizarGraduacao("observacoes", event.target.value)} className="min-h-20 resize-none bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-sm outline-none" placeholder="Observações opcionais" />

              {mensagemGraduacao && (
                <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-2xl text-xs font-bold text-zinc-300">
                  {mensagemGraduacao}
                </div>
              )}

              <button disabled={salvandoGraduacao} className="bg-red-600 hover:bg-red-700 disabled:opacity-50 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest">
                {salvandoGraduacao ? "Enviando..." : "Enviar graduação para análise"}
              </button>
            </form>
          )}
        </section>

        {/* CHECK-IN */}
        <button onClick={handleCheckIn} className="w-full bg-red-600 py-8 rounded-[40px] flex flex-col items-center justify-center shadow-xl shadow-red-600/20 active:scale-95 transition-all">
          <span className="text-4xl mb-2">🥊</span>
          <span className="font-black uppercase italic tracking-widest">Confirmar Presença</span>
        </button>

        {/* FINANCEIRO */}
        <div className="bg-white text-black rounded-[32px] sm:rounded-[40px] p-6 sm:p-8">
          <div className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vencimento</p>
              <p className="text-2xl font-black italic">DIA {aluno.dia_vencimento_pagamento ?? aluno.vencimento}</p>
            </div>
            <div className={`px-4 py-2 rounded-full text-[10px] font-black ${aluno.pago ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
              {aluno.pago ? 'PAGO' : 'EM FALTA'}
            </div>
          </div>

          {erro && (
            <div className="mb-4 bg-red-50 text-red-600 border border-red-200 p-3 rounded-2xl text-xs font-bold">
              {erro}
            </div>
          )}

          <div className="grid gap-3 mb-5 sm:grid-cols-2">
            <div className="bg-zinc-100 p-4 rounded-3xl">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Em aberto</p>
              <p className="mt-1 font-black">{formatarValor(valorEmAberto)}</p>
            </div>
            <div className="bg-zinc-100 p-4 rounded-3xl">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Vencido</p>
              <p className="mt-1 font-black">{formatarValor(valorVencido)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {cobrancas.length === 0 ? (
              <div className="bg-zinc-100 p-5 rounded-3xl text-center text-[10px] font-black uppercase tracking-widest text-zinc-400">Nenhuma cobrança registrada</div>
            ) : cobrancas.map((cobranca) => (
              <article key={cobranca.pagamento?.id ?? cobranca.dataVencimento} className="bg-zinc-100 p-5 rounded-3xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Vencimento</p>
                    <p className="text-sm font-black">{formatarData(cobranca.dataVencimento)}</p>
                  </div>
                  <span className="rounded-full bg-black px-3 py-1 text-[9px] font-black uppercase text-white">
                    {textoStatusFinanceiro(cobranca.status, cobranca.diasEmAtraso)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs font-bold text-zinc-600">
                  <span>Valor: {formatarValor(cobranca.valor)}</span>
                  <span>Dias em atraso: {cobranca.diasEmAtraso}</span>
                </div>
                {cobranca.pagamento?.observacoes && <p className="mt-3 text-xs font-medium text-zinc-500">{cobranca.pagamento.observacoes}</p>}
              </article>
            ))}
          </div>

          <p className="mt-5 text-[10px] font-black text-zinc-400 uppercase">Alterações financeiras são feitas pela equipe administrativa.</p>
        </div>
        {(observacoesAluno.length > 0 || eventosAluno.length > 0) && (
          <section className="bg-zinc-900 border border-zinc-800 rounded-[32px] sm:rounded-[40px] p-6 sm:p-8 shadow-2xl">
            <h2 className="text-2xl font-black uppercase italic">Linha do tempo</h2>
            <div className="mt-5 grid gap-3">
              {observacoesAluno.map((observacao) => (
                <article key={observacao.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-red-300">Observação {observacao.tipo}</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{observacao.conteudo}</p>
                </article>
              ))}
              {eventosAluno.map((evento) => (
                <article key={evento.id} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{evento.created_at ? new Date(evento.created_at).toLocaleDateString("pt-BR") : "-"}</p>
                  <h3 className="mt-1 text-sm font-black uppercase">{evento.titulo}</h3>
                  {evento.descricao && <p className="mt-2 text-xs leading-5 text-zinc-400">{evento.descricao}</p>}
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}