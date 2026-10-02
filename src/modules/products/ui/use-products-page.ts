"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { keepOnlyFirstPage } from "@/shared/http/keep-only-first-page";
import { useToast } from "@/shared/ui/use-toast";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useProductRepository } from "./use-product-repository";
import { PRODUCTS_PAGE_SIZE, type ActiveFilter, type Product, type ProductSortKey, type SortDirection, type StockFilter } from "../domain/product";

/**
 * Estado e dados da tela de Produtos: busca (com debounce), filtros, ordenação, expansão de
 * linha e a lista acumulada por rolagem infinita — mesmo comportamento do legado
 * (`pages/Products.tsx`), agora movido para `useInfiniteQuery`.
 */
export function useProductsPage() {
  const tenant = useRequiredTenant();
  const repository = useProductRepository();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [sortKey, setSortKey] = useState<ProductSortKey>("description");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce da busca para evitar requisições a cada tecla — igual ao legado.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      activeFilter,
      stockFilter,
      priceMin: priceMin ? Number(priceMin) : null,
      priceMax: priceMax ? Number(priceMax) : null,
      sortKey,
      sortDirection,
    }),
    [debouncedSearch, activeFilter, stockFilter, priceMin, priceMax, sortKey, sortDirection],
  );

  const queryKey = useMemo(
    () => ["products", tenant.companyId, tenant.storeId, filters] as const,
    [tenant.companyId, tenant.storeId, filters],
  );

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) =>
      repository.listPage({ ...filters, from: pageParam, to: pageParam + PRODUCTS_PAGE_SIZE - 1 }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) => {
      const loaded = pages.reduce((count, page) => count + page.items.length, 0);
      return loaded < lastPage.total ? loaded : undefined;
    },
  });

  // Recolhe o produto expandido ao trocar filtro/ordenação/busca/loja — ajuste durante a
  // renderização (não em efeito), como o React recomenda para "resetar estado quando um dado
  // muda": https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [expandedResetKey, setExpandedResetKey] = useState(queryKey);
  if (expandedResetKey !== queryKey) {
    setExpandedResetKey(queryKey);
    setExpandedId(null);
  }

  const products: Product[] = useMemo(() => query.data?.pages.flatMap((page) => page.items) ?? [], [query.data]);
  const total = query.data?.pages.at(-1)?.total ?? 0;

  const handleSort = useCallback(
    (key: ProductSortKey) => {
      if (sortKey === key) {
        setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        setSortDirection("asc");
      }
    },
    [sortKey],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const { refetch } = query;
  /** Como o legado (`loadFirstPage(true)`): recarrega só a 1ª página, sem repetir as roladas. */
  const handleRefresh = useCallback(async () => {
    keepOnlyFirstPage(queryClient, queryKey);
    const result = await refetch();
    if (result.isError) {
      toast({ title: "Falha ao atualizar", description: "Não foi possível recarregar os produtos.", variant: "destructive" });
    } else {
      toast({ title: "Dados atualizados", description: "Produtos recarregados com sucesso." });
    }
  }, [queryClient, queryKey, refetch, toast]);

  return {
    products,
    total,
    loading: query.isPending,
    loadingMore: query.isFetchingNextPage,
    refreshing: query.isRefetching,
    // `isLoadingError`, não `isError`: uma falha só no refresh/próxima página (já com dados na
    // tela) não deve trocar a lista inteira pela tela de erro — só a 1ª carga sem dados nenhum.
    isError: query.isLoadingError,
    hasMore: query.hasNextPage ?? false,
    fetchNextPage: query.fetchNextPage,
    search,
    setSearch,
    activeFilter,
    setActiveFilter,
    stockFilter,
    setStockFilter,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    sortKey,
    sortDirection,
    handleSort,
    expandedId,
    toggleExpand,
    handleRefresh,
  };
}
