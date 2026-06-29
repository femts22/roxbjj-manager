import { supabase } from "./supabase";
import type { AppRole, Profile } from "./types";

export const genericAuthError = "Não foi possível acessar o sistema.";
export const genericLoadError = "Não foi possível carregar os dados.";
export const genericSaveError = "Não foi possível salvar as alterações.";

export function canAccessDashboard(role: AppRole | null | undefined) {
  return role === "admin" || role === "professor";
}

export function canManageAlunos(role: AppRole | null | undefined) {
  return role === "admin";
}

export function getHomeRouteForRole(role: AppRole) {
  if (canAccessDashboard(role)) return "/dashboard";
  if (role === "responsavel") return "/responsavel";
  return "/aluno";
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,role")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !data) return null;

  return data;
}

export function logClientError(context: string, error: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(context, error);
  }
}
