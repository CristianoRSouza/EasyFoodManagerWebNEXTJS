"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/primitives/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/primitives/select";
import type { ActiveFilter, StockFilter } from "../domain/product";

export interface ProductsFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  activeFilter: ActiveFilter;
  onActiveFilterChange: (value: ActiveFilter) => void;
  stockFilter: StockFilter;
  onStockFilterChange: (value: StockFilter) => void;
  priceMin: string;
  onPriceMinChange: (value: string) => void;
  priceMax: string;
  onPriceMaxChange: (value: string) => void;
}

export function ProductsFilters({
  search,
  onSearchChange,
  activeFilter,
  onActiveFilterChange,
  stockFilter,
  onStockFilterChange,
  priceMin,
  onPriceMinChange,
  priceMax,
  onPriceMaxChange,
}: ProductsFiltersProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3">
      <div className="relative sm:col-span-2 lg:col-span-1 lg:flex-1 lg:min-w-[200px] lg:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome ou código..."
          className="pl-9"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <Select value={activeFilter} onValueChange={(v) => onActiveFilterChange(v as ActiveFilter)}>
        <SelectTrigger className="w-full lg:w-[130px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos</SelectItem>
          <SelectItem value="active">Ativos</SelectItem>
          <SelectItem value="inactive">Inativos</SelectItem>
        </SelectContent>
      </Select>
      <Select value={stockFilter} onValueChange={(v) => onStockFilterChange(v as StockFilter)}>
        <SelectTrigger className="w-full lg:w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Estoque: Todos</SelectItem>
          <SelectItem value="in_stock">Em estoque</SelectItem>
          <SelectItem value="out_of_stock">Sem estoque</SelectItem>
        </SelectContent>
      </Select>
      <Input
        type="number"
        inputMode="decimal"
        placeholder="Preço mín."
        className="w-full lg:w-[110px]"
        value={priceMin}
        onChange={(e) => onPriceMinChange(e.target.value)}
      />
      <Input
        type="number"
        inputMode="decimal"
        placeholder="Preço máx."
        className="w-full lg:w-[110px]"
        value={priceMax}
        onChange={(e) => onPriceMaxChange(e.target.value)}
      />
    </div>
  );
}
