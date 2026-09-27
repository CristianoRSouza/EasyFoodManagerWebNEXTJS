"use client";

import { Building2, ChevronDown, Store } from "lucide-react";
import { Button } from "@/shared/ui/primitives/button";
import { cn } from "@/shared/ui/cn";
import { useTenant } from "@/shared/tenant/tenant-context";

export function HeaderStoreInfo({ onOpenModal }: { onOpenModal(): void }) {
  const { selectedCompany, selectedStore, companies, storesByCompany } = useTenant();
  if (!selectedCompany) return null;

  const storeCount = Object.values(storesByCompany).flat().length;
  const canChange = companies.length > 1 || storeCount > 1;

  return (
    <Button
      type="button"
      variant="ghost"
      onClick={() => canChange && onOpenModal()}
      className={cn(
        "mr-1 flex h-auto items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-2 py-1 text-xs text-foreground hover:bg-primary/10 sm:mr-2 sm:gap-2 sm:px-3",
        !canChange && "cursor-default hover:bg-primary/5",
      )}
      title={canChange ? "Trocar empresa/loja" : selectedCompany.name}
    >
      <Building2 className="hidden h-3.5 w-3.5 shrink-0 text-primary sm:inline-block" aria-hidden />
      <span className="hidden max-w-[160px] truncate font-medium sm:inline-block">{selectedCompany.name}</span>
      {selectedStore && (
        <>
          <span className="hidden text-muted-foreground sm:inline-block">/</span>
          <Store className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="max-w-[100px] truncate sm:max-w-[160px]">
            {selectedStore.legacy_store_code} – {selectedStore.trade_name}
          </span>
        </>
      )}
      {canChange && <ChevronDown className="hidden h-3.5 w-3.5 shrink-0 text-muted-foreground sm:inline-block" />}
    </Button>
  );
}
