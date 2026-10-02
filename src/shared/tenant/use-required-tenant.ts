"use client";

import { useTenant } from "./tenant-context";
import type { Selection } from "./tenant";

/** Empresa/loja em nome de quem uma tela de dados age. Igual a {@link Selection}. */
export type Tenant = Selection;

/**
 * A seleção de empresa/loja, garantida presente.
 *
 * Todo repositório de módulo recebe `Tenant` no construtor — nunca `Tenant | null` — para que a
 * obrigatoriedade seja de construção, e não um `if` espalhado em cada `fetch`. O layout
 * (`StoreGate`) já bloqueia o conteúdo enquanto não há loja selecionada, então nenhuma tela viva
 * chega a montar sem seleção; o erro aqui é uma rede de segurança para uso incorreto do hook, não
 * um caminho esperado em produção.
 */
export function useRequiredTenant(): Tenant {
  const { selection } = useTenant();
  if (!selection) {
    throw new Error(
      "useRequiredTenant: nenhuma loja selecionada. O layout do painel deveria ter bloqueado o conteúdo antes de chegar aqui (StoreGate).",
    );
  }
  return selection;
}
