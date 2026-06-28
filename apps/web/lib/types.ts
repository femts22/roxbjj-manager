export type Faixa = "branca" | "azul" | "roxa" | "marrom" | "preta";
export type AppRole = "admin" | "professor" | "aluno";

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
};

export type AlunoUpdate = Partial<AlunoInsert>;

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
    };
    Enums: {
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};
