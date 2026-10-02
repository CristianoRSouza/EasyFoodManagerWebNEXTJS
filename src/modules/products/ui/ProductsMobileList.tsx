"use client";

import { Package } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/primitives/card";
import type { Product } from "../domain/product";
import { ProductMobileCard } from "./ProductMobileCard";

export function ProductsMobileList({
  products,
  expandedId,
  onToggleExpand,
}: {
  products: Product[];
  expandedId: string | null;
  onToggleExpand: (id: string) => void;
}) {
  return (
    <div className="md:hidden space-y-2">
      {products.length === 0 ? (
        <Card className="glass-panel">
          <CardContent className="text-center py-10 text-muted-foreground">
            <Package className="mx-auto h-8 w-8 mb-2 opacity-50" />
            Nenhum produto encontrado
          </CardContent>
        </Card>
      ) : (
        products.map((product) => (
          <ProductMobileCard
            key={product.id}
            product={product}
            isExpanded={expandedId === product.id}
            onToggle={() => onToggleExpand(product.id)}
          />
        ))
      )}
    </div>
  );
}
