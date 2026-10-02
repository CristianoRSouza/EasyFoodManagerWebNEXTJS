"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Ambiente, SupabasePublicConfig } from "./ambiente";

export interface RuntimeInfo {
  backend: "cloud" | "lan";
  /** `host:porta` do backend, exibido no badge do cabeçalho. */
  apiDisplayOrigin: string;
  adminPlatformUrl: string;
  /** Ausente = produção. Ver `ambiente.ts`. */
  ambiente?: Ambiente;
  /** Supabase público do ambiente (só a redefinição de senha usa); ausente/`null` = não configurado. */
  supabase?: SupabasePublicConfig | null;
}

const RuntimeContext = createContext<RuntimeInfo | null>(null);

/** Informação de servidor (não secreta) entregue às telas pelo layout. */
export function RuntimeProvider({ value, children }: { value: RuntimeInfo; children: ReactNode }) {
  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
}

export function useRuntime(): RuntimeInfo {
  const runtime = useContext(RuntimeContext);
  if (!runtime) throw new Error("useRuntime fora do RuntimeProvider.");
  return runtime;
}
