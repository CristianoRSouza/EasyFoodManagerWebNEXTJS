"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useAutoHideScroll } from "@/shared/ui/use-auto-hide-scroll";
import { Building2, Check, Search, Store, Loader2, RefreshCw, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/primitives/dialog";
import { Button } from "@/shared/ui/primitives/button";
import { ScrollArea } from "@/shared/ui/primitives/scroll-area";
import { Input } from "@/shared/ui/primitives/input";
import { cn } from "@/shared/ui/cn";
import { useTenant } from "@/shared/tenant/tenant-context";
import type { Company, Store as StoreType } from "@/shared/tenant/tenant";

interface Props {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

function StoreList({ children }: { children: ReactNode }) {
  const scrollRef = useAutoHideScroll<HTMLDivElement>();
  return (
    <div ref={scrollRef} className="divide-y divide-border/30 max-h-[40vh] sm:max-h-[44vh] overflow-y-auto overscroll-contain autohide-scroll">
      {children}
    </div>
  );
}

export const CompanySelectionModal = ({ open, onOpenChange }: Props) => {
  const { companies: availableCompanies, storesByCompany: allStoresByCompany, loading, select, selection, refresh } = useTenant();
  const allStoresLoaded = !loading;
  const selectedCompanyId = selection?.companyId ?? null;
  const selectedStoreId = selection?.storeId ?? null;

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPair, setSelectedPair] = useState<{ companyId: string; storeId: string } | null>(selection);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const handleConfirm = () => {
    if (selectedPair) {
      select(selectedPair.companyId, selectedPair.storeId);
      onOpenChange?.(false);
    }
  };

  const filteredGroups = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return availableCompanies
      .map((company) => {
        const stores = allStoresByCompany[company.id] || [];
        if (!term) return { company, stores };
        const cnpj = company.cnpj ?? "";
        const compMatch =
          company.name.toLowerCase().includes(term) || cnpj.includes(term);
        const matched = stores.filter(
          (s) =>
            s.trade_name.toLowerCase().includes(term) ||
            String(s.legacy_store_code).includes(term),
        );
        if (compMatch) return { company, stores };
        if (matched.length > 0) return { company, stores: matched };
        return null;
      })
      .filter(Boolean) as { company: Company; stores: StoreType[] }[];
  }, [availableCompanies, allStoresByCompany, searchTerm]);

  const canClose = !!selectedCompanyId && !!selectedStoreId;
  const showSearch =
    availableCompanies.length > 3 ||
    Object.values(allStoresByCompany).flat().length > 5;
  const multipleCompanies = availableCompanies.length > 1;

  return (
    <Dialog open={open} onOpenChange={canClose ? onOpenChange : undefined}>
      <DialogContent
        hideClose={!canClose}
        className="sm:max-w-md md:max-w-lg p-0 gap-0 overflow-hidden border-0 shadow-2xl w-[calc(100vw-1rem)] sm:w-full max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-1rem)] sm:max-h-[90vh] flex flex-col"
        onPointerDownOutside={(e) => { if (!canClose) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canClose) e.preventDefault(); }}
      >
        {/* Header — compacto em mobile */}
        <div className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/80 px-4 sm:px-6 py-3 sm:py-6 text-primary-foreground shrink-0">
          <DialogHeader className="relative z-10 text-center space-y-1 sm:space-y-2">
            <div className="mx-auto hidden sm:flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
              <Building2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <DialogTitle className="text-base sm:text-xl font-bold text-primary-foreground flex items-center justify-center gap-2 sm:block pr-8 sm:pr-0">
              <Building2 className="h-4 w-4 sm:hidden" />
              <span>Selecione onde trabalhar</span>
            </DialogTitle>
            <DialogDescription className="text-primary-foreground/80 text-[11px] sm:text-sm hidden sm:block">
              Escolha a empresa e a loja que deseja acessar.
            </DialogDescription>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="absolute right-0 top-0 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
              title="Atualizar lista"
            >
              <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isRefreshing && "animate-spin")} />
            </button>
          </DialogHeader>
        </div>

        <div className="bg-background p-3 sm:p-4 space-y-3 overflow-hidden flex-1 min-h-0 flex flex-col">
          {showSearch && (
            <div className="relative shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar empresa, loja ou CNPJ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 h-10 bg-muted/50 border-border/50"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <ScrollArea className="flex-1 min-h-0 min-w-0 -mx-1 pr-1 overflow-hidden">
            {!allStoresLoaded ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum resultado encontrado</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-3 px-1 py-1 w-full overflow-hidden">
                {filteredGroups.map(({ company, stores }) => (
                  <div
                    key={company.id}
                    className="rounded-xl border bg-card overflow-hidden flex flex-col min-w-0"
                  >
                    {multipleCompanies && (
                      <div className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 bg-muted/40 border-b border-border/50 shrink-0 min-w-0">
                        <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 font-bold text-[11px] sm:text-xs text-primary">
                          {company.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-semibold text-foreground truncate leading-tight">
                            {company.name}
                          </p>
                          {company.cnpj && (
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-mono leading-tight mt-0.5 truncate">
                              {company.cnpj}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] sm:text-[11px] text-muted-foreground bg-background/60 border border-border/60 rounded-full px-2 py-0.5">
                          {stores.length} {stores.length === 1 ? "loja" : "lojas"}
                        </span>
                      </div>
                    )}

                    {/* Sub-scroll por cartão: limita altura para não estourar a viewport mobile */}
                    <StoreList>
                      {stores.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground">
                          Sem lojas disponíveis nesta empresa.
                        </p>
                      ) : (
                        stores.map((store) => {
                          const isSelected =
                            selectedPair?.companyId === company.id &&
                            selectedPair?.storeId === store.id;
                          return (
                            <button
                              key={store.id}
                              onClick={() =>
                                setSelectedPair({ companyId: company.id, storeId: store.id })
                              }
                              className={cn(
                                "w-full flex items-center gap-3 px-3 sm:px-4 py-3 sm:py-3 min-h-[52px] transition-colors text-left",
                                "focus:outline-none focus:bg-primary/5 hover:bg-muted/50 active:bg-primary/10",
                                isSelected && "bg-primary/5",
                              )}
                            >
                              <Store
                                className={cn(
                                  "h-4 w-4 shrink-0",
                                  isSelected ? "text-primary" : "text-muted-foreground",
                                )}
                              />
                              <div className="flex-1 min-w-0 flex items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-flex items-center justify-center h-5 min-w-[1.75rem] px-1.5 rounded text-[11px] font-mono font-medium shrink-0",
                                    isSelected
                                      ? "bg-primary/15 text-primary"
                                      : "bg-muted text-muted-foreground",
                                  )}
                                >
                                  {store.legacy_store_code}
                                </span>
                                <span
                                  className={cn(
                                    "text-sm truncate",
                                    isSelected ? "font-semibold text-primary" : "text-foreground",
                                  )}
                                >
                                  {store.trade_name}
                                </span>
                              </div>
                              <div
                                className={cn(
                                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                                  isSelected
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/30",
                                )}
                              >
                                {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </StoreList>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {selectedPair && (
          <div className="border-t bg-muted/30 px-3 sm:px-6 py-3 sm:py-4 shrink-0">
            <Button
              onClick={handleConfirm}
              className="w-full h-11 font-semibold"
              size="lg"
            >
              Acessar loja selecionada
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
