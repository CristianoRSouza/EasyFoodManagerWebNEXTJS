import type { ReactNode } from "react";
import { getServerConfig } from "@/server/gateway";
import { RuntimeProvider } from "@/shared/runtime/runtime-context";
import { TenantProvider } from "@/shared/tenant/tenant-context";
import { AppLayout } from "@/shared/layout/AppLayout";
import { ErrorBoundary } from "@/shared/layout/ErrorBoundary";

export const dynamic = "force-dynamic";

export default function PanelLayout({ children }: { children: ReactNode }) {
  const { backend, apiDisplayOrigin, adminPlatformUrl } = getServerConfig();
  return (
    <RuntimeProvider value={{ backend, apiDisplayOrigin, adminPlatformUrl }}>
      <TenantProvider>
        <ErrorBoundary>
          <AppLayout>{children}</AppLayout>
        </ErrorBoundary>
      </TenantProvider>
    </RuntimeProvider>
  );
}
