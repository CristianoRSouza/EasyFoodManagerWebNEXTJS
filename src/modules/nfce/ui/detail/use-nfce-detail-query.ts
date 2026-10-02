"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import type { NfceDetail } from "../../domain/nfce-detail";
import type { NfceEvent, NfceLogEntry } from "../../domain/nfce-history";
import type { NfceItem } from "../../domain/nfce-item";
import type { NfcePayment } from "../../domain/nfce-payment";
import { useNfceRepository } from "../use-nfce-repository";

export interface NfceDetailBundle {
  detail: NfceDetail;
  items: NfceItem[];
  payments: NfcePayment[];
  logs: NfceLogEntry[];
  events: NfceEvent[];
}

/**
 * Carrega o detalhe e os quatro sub-recursos de uma nota numa única onda paralela — mesma
 * otimização do legado (`loadNote`): antes eram dois round-trips (3 + 2 sequencial), agora um só.
 * Logs/eventos nunca bloqueiam o carregamento principal: falha neles vira lista vazia, igual ao
 * legado (`.catch(() => [])`).
 *
 * `null` (sem erro) quando a nota não existe — a página mostra "Nota não encontrada", não um erro.
 */
export function useNfceDetailQuery(noteId: string): UseQueryResult<NfceDetailBundle | null> {
  const tenant = useRequiredTenant();
  const repository = useNfceRepository();

  return useQuery({
    queryKey: ["nfce-detail", tenant.companyId, tenant.storeId, noteId],
    queryFn: async (): Promise<NfceDetailBundle | null> => {
      const [detail, items, payments, logs, events] = await Promise.all([
        repository.detail(noteId),
        repository.items(noteId),
        repository.payments(noteId),
        repository.logs(noteId).catch(() => [] as NfceLogEntry[]),
        repository.events(noteId).catch(() => [] as NfceEvent[]),
      ]);
      if (!detail) return null;
      return { detail, items, payments, logs, events };
    },
  });
}
