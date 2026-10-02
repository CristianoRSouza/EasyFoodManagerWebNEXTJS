"use client";

import { useEffect, useRef } from "react";
import { PageRefreshButton } from "@/shared/ui/PageRefreshButton";
import { useProductsPage } from "./use-products-page";
import { ProductsFilters } from "./ProductsFilters";
import { ProductsMobileList } from "./ProductsMobileList";
import { ProductsTable } from "./ProductsTable";

export function ProductsPage() {
  const {
    products,
    total,
    loading,
    refreshing,
    isError,
    hasMore,
    fetchNextPage,
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
  } = useProductsPage();

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Scroll infinito: dispara a próxima página quando o sentinel entra na viewport.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-muted-foreground animate-pulse">Carregando produtos...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-destructive">Não foi possível carregar os produtos.</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold font-heading">Produtos</h1>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs sm:text-sm text-muted-foreground">
            {total} produto{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </span>
          <PageRefreshButton onClick={handleRefresh} refreshing={refreshing} />
        </div>
      </div>

      <ProductsFilters
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        stockFilter={stockFilter}
        onStockFilterChange={setStockFilter}
        priceMin={priceMin}
        onPriceMinChange={setPriceMin}
        priceMax={priceMax}
        onPriceMaxChange={setPriceMax}
      />

      <ProductsMobileList products={products} expandedId={expandedId} onToggleExpand={toggleExpand} />

      <ProductsTable
        products={products}
        sortKey={sortKey}
        sortDirection={sortDirection}
        onSort={handleSort}
        expandedId={expandedId}
        onToggleExpand={toggleExpand}
      />

      {/* Sentinel/rodapé único para ambos os layouts */}
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <span className="text-sm text-muted-foreground animate-pulse">Carregando mais...</span>
        </div>
      )}
      {!hasMore && products.length > 0 && (
        <div className="text-center py-3 text-xs text-muted-foreground">Mostrando todos os {total} produtos</div>
      )}
    </div>
  );
}
