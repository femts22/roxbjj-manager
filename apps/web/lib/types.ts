export type Faixa = "branca" | "azul" | "roxa" | "marrom" | "preta";
export type AppRole = "admin" | "professor" | "aluno" | "responsavel";
export type CategoriaGraduacao = "infantil" | "juvenil" | "adulto";
export type FaixaGraduacao =
  | Faixa
  | "cinza/branca"
  | "cinza"
  | "cinza/preta"
  | "amarela/branca"
  | "amarela"
  | "amarela/preta"
  | "laranja/branca"
  | "laranja"
  | "laranja/preta"
  | "verde/branca"
  | "verde"
  | "verde/preta";
export type GraduacaoStatus = "pendente" | "aprovada" | "recusada";
export type PagamentoStatus = "aberto" | "pago" | "vencido" | "cancelado";
export type PagamentoVencimentoSolicitacaoStatus = "pendente" | "aprovada" | "recusada";
export type AlunoObservacaoTipo = "geral" | "financeiro" | "graduação" | "comportamento" | "saúde";
export type AlunoObservacaoVisibilidade = "interna" | "aluno" | "responsavel";

export type Aluno = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  categoria: CategoriaGraduacao;
  faixa: FaixaGraduacao;
  grau: number;
  graus: number;
  graduacao_aprovada: boolean;
  pago: boolean;
  vencimento: number;
  dia_vencimento_pagamento?: number | null;
  presencas: number;
  telefone?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
  nome_social?: string | null;
  cpf?: string | null;
  rg?: string | null;
  whatsapp?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  contato_emergencia_nome?: string | null;
  contato_emergencia_telefone?: string | null;
  contato_emergencia_parentesco?: string | null;
  tipo_sanguineo?: string | null;
  alergias?: string | null;
  restricoes_medicas?: string | null;
  medicamentos_uso_continuo?: string | null;
  observacoes_medicas?: string | null;
  responsavel_principal_nome?: string | null;
  responsavel_principal_telefone?: string | null;
  responsavel_principal_whatsapp?: string | null;
  responsavel_principal_email?: string | null;
  responsavel_principal_parentesco?: string | null;
  cadastro_completo: boolean;
  cadastro_atualizado_em?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AlunoInsert = {
  user_id: string;
  nome: string;
  email: string;
  categoria: CategoriaGraduacao;
  faixa: FaixaGraduacao;
  grau: number;
  graus: number;
  graduacao_aprovada?: boolean;
  pago: boolean;
  vencimento: number;
  dia_vencimento_pagamento?: number | null;
  presencas: number;
  telefone?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
  nome_social?: string | null;
  cpf?: string | null;
  rg?: string | null;
  whatsapp?: string | null;
  cep?: string | null;
  rua?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  contato_emergencia_nome?: string | null;
  contato_emergencia_telefone?: string | null;
  contato_emergencia_parentesco?: string | null;
  tipo_sanguineo?: string | null;
  alergias?: string | null;
  restricoes_medicas?: string | null;
  medicamentos_uso_continuo?: string | null;
  observacoes_medicas?: string | null;
  responsavel_principal_nome?: string | null;
  responsavel_principal_telefone?: string | null;
  responsavel_principal_whatsapp?: string | null;
  responsavel_principal_email?: string | null;
  responsavel_principal_parentesco?: string | null;
  cadastro_completo?: boolean;
  cadastro_atualizado_em?: string | null;
};

export type AlunoUpdate = Partial<AlunoInsert>;

export type GraduacaoSolicitacao = {
  id: string;
  aluno_id: string;
  user_id: string;
  categoria: CategoriaGraduacao;
  faixa: FaixaGraduacao;
  graus: number;
  data_ultima_graduacao?: string | null;
  academia_origem?: string | null;
  professor_graduador?: string | null;
  observacoes?: string | null;
  status: GraduacaoStatus;
  analisado_por?: string | null;
  analisado_em?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type GraduacaoSolicitacaoInsert = {
  aluno_id: string;
  user_id: string;
  categoria: CategoriaGraduacao;
  faixa: FaixaGraduacao;
  graus: number;
  data_ultima_graduacao?: string | null;
  academia_origem?: string | null;
  professor_graduador?: string | null;
  observacoes?: string | null;
};

export type GraduacaoHistorico = {
  id: string;
  aluno_id: string;
  solicitacao_id?: string | null;
  categoria: CategoriaGraduacao;
  faixa: FaixaGraduacao;
  graus: number;
  data_graduacao?: string | null;
  origem: "solicitacao_aprovada" | "admin";
  aprovado_por?: string | null;
  observacoes?: string | null;
  created_at?: string;
};

export type ResponsavelAluno = {
  responsavel_id: string;
  aluno_id: string;
  created_at?: string;
};

export type ResponsavelAlunoInsert = {
  responsavel_id: string;
  aluno_id: string;
};

export type Pagamento = {
  id: string;
  aluno_id: string;
  valor?: number | null;
  data_vencimento: string;
  data_pagamento?: string | null;
  status: PagamentoStatus;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PagamentoInsert = {
  aluno_id: string;
  valor?: number | null;
  data_vencimento: string;
  data_pagamento?: string | null;
  status?: PagamentoStatus;
  observacoes?: string | null;
};

export type PagamentoVencimentoSolicitacao = {
  id: string;
  aluno_id: string;
  user_id: string;
  dia_atual: number;
  dia_solicitado: number;
  motivo?: string | null;
  status: PagamentoVencimentoSolicitacaoStatus;
  analisado_por?: string | null;
  analisado_em?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type PagamentoVencimentoSolicitacaoInsert = {
  aluno_id: string;
  user_id: string;
  dia_atual: number;
  dia_solicitado: number;
  motivo?: string | null;
};


export type AlunoObservacao = {
  id: string;
  aluno_id: string;
  autor_id?: string | null;
  tipo: AlunoObservacaoTipo;
  visibilidade: AlunoObservacaoVisibilidade;
  conteudo: string;
  created_at?: string;
  updated_at?: string;
};

export type AlunoObservacaoInsert = {
  aluno_id: string;
  autor_id?: string | null;
  tipo?: AlunoObservacaoTipo;
  visibilidade?: AlunoObservacaoVisibilidade;
  conteudo: string;
};

export type AlunoEvento = {
  id: string;
  aluno_id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  criado_por?: string | null;
  created_at?: string;
};

export type AlunoEventoInsert = {
  aluno_id: string;
  tipo: string;
  titulo: string;
  descricao?: string | null;
  criado_por?: string | null;
};
export type Profile = {
  id: string;
  email: string;
  role: AppRole;
  created_at?: string;
  updated_at?: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Profile;
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      alunos: {
        Row: Aluno;
        Insert: AlunoInsert;
        Update: AlunoUpdate;
        Relationships: [];
      };
      graduacao_solicitacoes: {
        Row: GraduacaoSolicitacao;
        Insert: GraduacaoSolicitacaoInsert;
        Update: Partial<Omit<GraduacaoSolicitacao, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      graduacao_historico: {
        Row: GraduacaoHistorico;
        Insert: Omit<GraduacaoHistorico, "id" | "created_at">;
        Update: Partial<Omit<GraduacaoHistorico, "id" | "created_at">>;
        Relationships: [];
      };
      responsavel_alunos: {
        Row: ResponsavelAluno;
        Insert: ResponsavelAlunoInsert;
        Update: Partial<ResponsavelAlunoInsert>;
        Relationships: [];
      };
      pagamentos: {
        Row: Pagamento;
        Insert: PagamentoInsert;
        Update: Partial<Omit<Pagamento, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      pagamento_vencimento_solicitacoes: {
        Row: PagamentoVencimentoSolicitacao;
        Insert: PagamentoVencimentoSolicitacaoInsert;
        Update: Partial<Omit<PagamentoVencimentoSolicitacao, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      aluno_observacoes: {
        Row: AlunoObservacao;
        Insert: AlunoObservacaoInsert;
        Update: Partial<Omit<AlunoObservacao, "id" | "created_at" | "updated_at">>;
        Relationships: [];
      };
      aluno_eventos: {
        Row: AlunoEvento;
        Insert: AlunoEventoInsert;
        Update: Partial<Omit<AlunoEvento, "id" | "created_at">>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      registrar_presenca: {
        Args: Record<string, never>;
        Returns: null;
      };
      atualizar_graduacao_aluno: {
        Args: {
          p_aluno_id: string;
        };
        Returns: null;
      };
      is_responsavel: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      aprovar_graduacao_solicitacao: {
        Args: {
          p_solicitacao_id: string;
        };
        Returns: null;
      };
      recusar_graduacao_solicitacao: {
        Args: {
          p_solicitacao_id: string;
        };
        Returns: null;
      };
      aprovar_pagamento_vencimento_solicitacao: {
        Args: {
          p_solicitacao_id: string;
        };
        Returns: null;
      };
      recusar_pagamento_vencimento_solicitacao: {
        Args: {
          p_solicitacao_id: string;
        };
        Returns: null;
      };
      atualizar_cadastro_aluno: {
        Args: {
          p_nome: string;
          p_nome_social: string | null;
          p_cpf: string | null;
          p_rg: string | null;
          p_data_nascimento: string | null;
          p_telefone: string | null;
          p_whatsapp: string | null;
          p_email: string;
          p_cep: string | null;
          p_rua: string | null;
          p_numero: string | null;
          p_complemento: string | null;
          p_bairro: string | null;
          p_cidade: string | null;
          p_estado: string | null;
          p_contato_emergencia_nome: string | null;
          p_contato_emergencia_telefone: string | null;
          p_contato_emergencia_parentesco: string | null;
          p_tipo_sanguineo: string | null;
          p_alergias: string | null;
          p_restricoes_medicas: string | null;
          p_medicamentos_uso_continuo: string | null;
          p_observacoes_medicas: string | null;
          p_responsavel_principal_nome: string | null;
          p_responsavel_principal_telefone: string | null;
          p_responsavel_principal_whatsapp: string | null;
          p_responsavel_principal_email: string | null;
          p_responsavel_principal_parentesco: string | null;
          p_observacoes: string | null;
        };
        Returns: null;
      };
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
