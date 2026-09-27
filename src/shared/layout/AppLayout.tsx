"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { SidebarProvider, SidebarTrigger } from "@/shared/ui/primitives/sidebar";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useTenant } from "@/shared/tenant/tenant-context";
import { AppSidebar } from "./AppSidebar";
import { CompanySelectionModal } from "./CompanySelectionModal";
import { HeaderStoreInfo } from "./HeaderStoreInfo";
import { RuntimeModeBadge } from "./RuntimeModeBadge";
import { StoreGate } from "./StoreGate";
import { UserMenu } from "./UserMenu";

/** O modal só abre se a falta de loja persistir ~200ms (evita piscar em recarregamentos). */
const SELECTION_MODAL_DELAY_MS = 200;

export function AppLayout({ children }: { children: ReactNode }) {
  const { backend } = useRuntime();
  const cloud = backend === "cloud";
  const { needsSelection, selectedCompany, selection, loading } = useTenant();
  const [dark, setDark] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if (!cloud) return;
    if (!needsSelection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- fecha o modal assim que a seleção deixa de ser necessária (mesmo comportamento do legado)
      setModalOpen(false);
      return;
    }
    const timer = window.setTimeout(() => setModalOpen(true), SELECTION_MODAL_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [cloud, needsSelection]);

  const reopenIfNeeded = () => {
    if (cloud && needsSelection && !modalOpen) setModalOpen(true);
  };
  const blocked = cloud && !selection;

  return (
    <SidebarProvider>
      <div className="flex h-screen max-h-screen w-full min-h-0 overflow-hidden">
        <AppSidebar />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <header className="h-10 flex items-center border-b border-border px-4 gap-2 shrink-0 bg-card/50 backdrop-blur-sm">
            <div>
              <SidebarTrigger />
            </div>
            <div className="ml-2 hidden items-center gap-2 text-xs text-muted-foreground md:flex">
              <span>Desenvolvido por</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- mesmo <img> do legado, sem otimização que mude o pixel */}
              <img src="/easysoft-logo.png" alt="EasySoft" className="h-5 object-contain opacity-80" />
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1">
              <RuntimeModeBadge />
              {cloud && selectedCompany && <HeaderStoreInfo onOpenModal={() => setModalOpen(true)} />}
              {cloud && <UserMenu />}
              <Button variant="ghost" size="icon" onClick={() => setDark(!dark)} className="h-7 w-7">
                {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </header>
          <main className="sidebar-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6" onClickCapture={reopenIfNeeded}>
            {blocked ? <StoreGate loading={loading} onSelect={() => setModalOpen(true)} /> : children}
          </main>
        </div>
      </div>
      {cloud && <CompanySelectionModal open={modalOpen} onOpenChange={setModalOpen} />}
    </SidebarProvider>
  );
}
