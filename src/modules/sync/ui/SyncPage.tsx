"use client";

import { useRuntime } from "@/shared/runtime/runtime-context";
import { CloudSyncMonitorPage } from "./CloudSyncMonitorPage";
import { LocalSyncMonitorPage } from "./LocalSyncMonitorPage";

/**
 * `/sync`: como o `App.tsx` do legado (`isCloudApiMode() || isCloudSupabaseMode()`), a nuvem
 * abre o monitor da nuvem e a loja abre o monitor local (Log + Inbox + Outbox).
 */
export function SyncPage() {
  const { backend } = useRuntime();
  return backend === "cloud" ? <CloudSyncMonitorPage /> : <LocalSyncMonitorPage />;
}
