"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "@/shared/ui/primitives/card";
import { Badge } from "@/shared/ui/primitives/badge";
import type { Product } from "../domain/product";
import { ProductImage } from "./ProductImage";
import { ProductFiscalDetails } from "./ProductFiscalDetails";
import { Money } from "@/shared/ui/Money";
import { formatQuantity, isZeroQuantity } from "@/shared/format/quantity";

export function ProductMobileCard({
  product,
  isExpanded,
  onToggle,
}: {
  product: Product;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card className={`glass-panel transition-colors ${isExpanded ? "border-l-4 border-l-primary bg-primary/5" : ""}`}>
      <button type="button" onClick={onToggle} className="w-full text-left p-3 flex gap-3 items-start">
        <ProductImage barcode={product.barcode} imageUrl={product.imageUrl} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium leading-snug truncate ${isExpanded ? "text-primary" : ""}`}>{product.description}</p>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            )}
          </div>
          <p className="font-mono text-[11px] text-muted-foreground truncate">{product.barcode}</p>
          <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
            <span className="text-sm font-semibold"><Money value={product.salePrice} /></span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isZeroQuantity(product.stockQuantity) ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                Estoque: {formatQuantity(product.stockQuantity, product.unitIsFractional)}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] ${
                  product.isActive ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"
                }`}
              >
                {product.isActive ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
          {product.unitName && <p className="text-[11px] text-muted-foreground mt-0.5">Unidade: {product.unitName}</p>}
        </div>
      </button>
      {isExpanded && (
        <div className="border-t border-primary/20 bg-card/40">
          <ProductFiscalDetails productId={product.id} />
        </div>
      )}
    </Card>
  );
}
