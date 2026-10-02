"use client";

import { ArrowDown, ArrowUp, ArrowUpDown, Package } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/primitives/table";
import type { Product, ProductSortKey, SortDirection } from "../domain/product";
import { ProductTableRow } from "./ProductTableRow";

function SortIcon({ col, sortKey, sortDirection }: { col: ProductSortKey; sortKey: ProductSortKey; sortDirection: SortDirection }) {
  if (sortKey !== col) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
  return sortDirection === "asc" ? <ArrowUp className="ml-1 h-3 w-3 text-primary" /> : <ArrowDown className="ml-1 h-3 w-3 text-primary" />;
}

export function ProductsTable({
  products,
  sortKey,
  sortDirection,
  onSort,
  expandedId,
  onToggleExpand,
}: {
  products: Product[];
  sortKey: ProductSortKey;
  sortDirection: SortDirection;
  onSort: (key: ProductSortKey) => void;
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <Card className="glass-panel hidden md:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead className="w-[60px]">Foto</TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort("description")}>
                  <span className="flex items-center">
                    Produto <SortIcon col="description" sortKey={sortKey} sortDirection={sortDirection} />
                  </span>
                </TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort("barcode")}>
                  <span className="flex items-center">
                    Código de Barras <SortIcon col="barcode" sortKey={sortKey} sortDirection={sortDirection} />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors text-right"
                  onClick={() => onSort("salePrice")}
                >
                  <span className="flex items-center justify-end">
                    Preço <SortIcon col="salePrice" sortKey={sortKey} sortDirection={sortDirection} />
                  </span>
                </TableHead>
                <TableHead
                  className="cursor-pointer select-none hover:text-foreground transition-colors text-right"
                  onClick={() => onSort("stockQuantity")}
                >
                  <span className="flex items-center justify-end">
                    Estoque <SortIcon col="stockQuantity" sortKey={sortKey} sortDirection={sortDirection} />
                  </span>
                </TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => onSort("isActive")}>
                  <span className="flex items-center">
                    Status <SortIcon col="isActive" sortKey={sortKey} sortDirection={sortDirection} />
                  </span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
                    Nenhum produto encontrado
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <ProductTableRow
                    key={product.id}
                    product={product}
                    isExpanded={expandedId === product.id}
                    onToggle={() => onToggleExpand(product.id)}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
