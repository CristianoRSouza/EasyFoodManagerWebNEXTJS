/**
 * Filtros iniciais da lista de NFC-e, lidos da URL da rota `/nfce`.
 *
 * Invariante 3 (plano da Fase 3): os cards de atenção do Dashboard linkam para cá com
 * `?status=manual_review`, `?status=all&reconcileStatus=failed` ou `?status=unusable`
 * (`src/modules/dashboard/ui/NfceAttentionPanel.tsx`). Esta função só traduz `URLSearchParams`
 * em filtros — sem acoplar a nenhum hook do Next, para poder ser testada sem montar componente.
 */
export interface NfceListUrlFilters {
  /** `"all"` quando ausente — mesmo padrão do `<Select>` de status da tela. */
  status: string;
  /** `""` quando ausente — nenhum filtro de reconciliação aplicado. */
  reconcileStatus: string;
}

export function parseNfceListUrlFilters(searchParams: URLSearchParams): NfceListUrlFilters {
  return {
    status: searchParams.get("status") || "all",
    reconcileStatus: searchParams.get("reconcileStatus") || "",
  };
}
