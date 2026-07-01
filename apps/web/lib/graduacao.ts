import type { CategoriaGraduacao, FaixaGraduacao } from "./types";

export const categoriasGraduacao: CategoriaGraduacao[] = ["infantil", "juvenil", "adulto"];

export const faixasPorCategoria: Record<CategoriaGraduacao, FaixaGraduacao[]> = {
  infantil: [
    "branca",
    "cinza/branca",
    "cinza",
    "cinza/preta",
    "amarela/branca",
    "amarela",
    "amarela/preta",
    "laranja/branca",
    "laranja",
    "laranja/preta",
    "verde/branca",
    "verde",
    "verde/preta",
  ],
  juvenil: ["branca", "azul", "roxa"],
  adulto: ["branca", "azul", "roxa", "marrom", "preta"],
};

export function faixaCompativelComCategoria(categoria: CategoriaGraduacao, faixa: string) {
  return faixasPorCategoria[categoria].includes(faixa as FaixaGraduacao);
}
