export type Faixa = "branca" | "azul" | "roxa" | "marrom" | "preta";

export type Aluno = {
  id: string;
  nome: string;
  email: string;
  faixa: Faixa;
  grau: number;
  pago: boolean;
  vencimento: number;
  presencas: number | null;
};

export type AlunoInsert = Omit<Aluno, "id">;

export type AlunoUpdate = Partial<AlunoInsert>;

export type Database = {
  public: {
    Tables: {
      alunos: {
        Row: Aluno;
        Insert: AlunoInsert;
        Update: AlunoUpdate;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
