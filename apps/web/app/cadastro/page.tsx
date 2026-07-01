"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarDays, Loader2, Lock, Mail, Phone, User } from "lucide-react";
import { genericAuthError, logClientError } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type CadastroForm = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  dataNascimento: string;
  diaVencimentoPagamento: string;
  observacoes: string;
};

const formInicial: CadastroForm = {
  nome: "",
  email: "",
  senha: "",
  telefone: "",
  dataNascimento: "",
  diaVencimentoPagamento: "10",
  observacoes: "",
};

function validarCadastro(form: CadastroForm) {
  if (form.nome.trim().length < 3) return "Informe seu nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Informe um e-mail válido.";
  if (form.senha.length < 6) return "A senha deve ter pelo menos 6 caracteres.";
  if (![5, 10, 15, 20, 25].includes(Number(form.diaVencimentoPagamento))) return "Escolha um dia de vencimento válido.";
  return null;
}

export default function CadastroAlunoPage() {
  const [form, setForm] = useState<CadastroForm>(formInicial);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const router = useRouter();

  function atualizarCampo<K extends keyof CadastroForm>(campo: K, valor: CadastroForm[K]) {
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  async function handleCadastro(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setSucesso(null);

    const erroValidacao = validarCadastro(form);
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }

    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();
      const diaVencimentoPagamento = Number(form.diaVencimentoPagamento) || 10;
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.senha,
        options: {
          data: {
            signup_origin: "public_aluno",
            nome: form.nome.trim(),
            telefone: form.telefone.trim() || null,
            data_nascimento: form.dataNascimento || null,
            dia_vencimento_pagamento: diaVencimentoPagamento,
            observacoes: form.observacoes.trim() || null,
          },
        },
      });

      if (error) throw error;

      if (data.session) {
        router.push("/aluno");
        router.refresh();
        return;
      }

      setSucesso("Cadastro criado. Verifique seu e-mail para acessar sua área de aluno.");
      setForm(formInicial);
    } catch (error: unknown) {
      logClientError("Student signup failed", error);
      setErro(genericAuthError);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4 py-8">
      <main className="w-full max-w-xl space-y-6 bg-white p-8 rounded-2xl border border-gray-200 shadow-xl">
        <header className="text-center space-y-2">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">
            ROXBJJ <span className="text-red-600">PLANALTO</span>
          </h1>
          <p className="text-gray-500 text-sm font-medium uppercase tracking-widest">
            Cadastro de aluno
          </p>
        </header>

        <form onSubmit={handleCadastro} className="space-y-4">
          <div className="relative">
            <User className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <input
              required
              value={form.nome}
              onChange={(event) => atualizarCampo("nome", event.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              placeholder="Nome completo"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Mail className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => atualizarCampo("email", event.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="E-mail"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                type="password"
                required
                minLength={6}
                value={form.senha}
                onChange={(event) => atualizarCampo("senha", event.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Senha"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative">
              <Phone className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
              <input
                value={form.telefone}
                onChange={(event) => atualizarCampo("telefone", event.target.value)}
                className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                placeholder="Telefone"
              />
            </div>

            <input
              type="date"
              value={form.dataNascimento}
              onChange={(event) => atualizarCampo("dataNascimento", event.target.value)}
              className="w-full bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              aria-label="Data de nascimento"
            />
          </div>

          <div className="relative">
            <CalendarDays className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
            <select
              value={form.diaVencimentoPagamento}
              onChange={(event) => atualizarCampo("diaVencimentoPagamento", event.target.value)}
              className="w-full appearance-none bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
              aria-label="Dia de vencimento do pagamento"
            >
              <option value="5">Vencimento dia 5</option>
              <option value="10">Vencimento dia 10</option>
              <option value="15">Vencimento dia 15</option>
              <option value="20">Vencimento dia 20</option>
              <option value="25">Vencimento dia 25</option>
            </select>
          </div>

          <textarea
            value={form.observacoes}
            onChange={(event) => atualizarCampo("observacoes", event.target.value)}
            className="min-h-24 w-full resize-none bg-gray-50 border border-gray-300 text-gray-900 rounded-lg py-3 px-4 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            placeholder="Observações opcionais"
          />

          {erro && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm p-3 rounded-lg font-bold">
              {sucesso}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-lg shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : "CRIAR CADASTRO DE ALUNO"}
          </button>
        </form>

        <div className="text-center">
          <Link href="/" className="text-sm font-bold text-gray-500 hover:text-gray-900">
            Já tenho cadastro, quero entrar
          </Link>
        </div>
      </main>
    </div>
  );
}
