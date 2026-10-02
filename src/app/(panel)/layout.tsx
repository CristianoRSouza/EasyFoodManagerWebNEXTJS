import type { ReactNode } from "react";
import { TenantProvider } from "@/shared/tenant/tenant-context";
import { AppLayout } from "@/shared/layout/AppLayout";
import { ErrorBoundary } from "@/shared/layout/ErrorBoundary";
import { AIChatButton } from "@/modules/assistant/ui/AIChatButton";

export const dynamic = "force-dynamic";

// O `RuntimeProvider` (backend, ambiente, ...) vem do layout raiz — também as telas fora do painel
// (login, redefinição de senha) precisam dele.
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <TenantProvider>
      <ErrorBoundary>
        <AppLayout assistant={<AIChatButton />}>{children}</AppLayout>
      </ErrorBoundary>
    </TenantProvider>
  );
}
