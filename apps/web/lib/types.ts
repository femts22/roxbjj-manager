export type Faixa = "branca" | "azul" | "roxa" | "marrom" | "preta";
export type AppRole = "admin" | "professor" | "aluno" | "responsavel";

export type Aluno = {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  faixa: Faixa;
  grau: number;
  pago: boolean;
  vencimento: number;
  presencas: number;
  telefone?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AlunoInsert = {
  user_id: string;
  nome: string;
  email: string;
  faixa: Faixa;
  grau: number;
  pago: boolean;
  vencimento: number;
  presencas: number;
  telefone?: string | null;
  data_nascimento?: string | null;
  observacoes?: string | null;
};

export type AlunoUpdate = Partial<AlunoInsert>;

export type ResponsavelAluno = {
  responsavel_id: string;
  aluno_id: string;
  created_at?: string;
};

export type ResponsavelAlunoInsert = {
  responsavel_id: string;
  aluno_id: string;
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
      responsavel_alunos: {
        Row: ResponsavelAluno;
        Insert: ResponsavelAlunoInsert;
        Update: Partial<ResponsavelAlunoInsert>;
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
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
