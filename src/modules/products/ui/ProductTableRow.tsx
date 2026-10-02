"use client";

import { Fragment } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { TableCell, TableRow } from "@/shared/ui/primitives/table";
import { Badge } from "@/shared/ui/primitives/badge";
import type { Product } from "../domain/product";
import { ProductImage } from "./ProductImage";
import { ProductFiscalDetails } from "./ProductFiscalDetails";
import { Money } from "@/shared/ui/Money";
import { formatQuantity, isZeroQuantity } from "@/shared/format/quantity";

export function ProductTableRow({
  product,
  isExpanded,
  onToggle,
}: {
  product: Product;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Fragment>
      <TableRow
        className={`cursor-pointer transition-colors ${
          isExpanded
            ? "bg-primary/10 border-l-4 border-l-primary shadow-[inset_0_-1px_0_0_hsl(var(--primary)/0.3)]"
            : "hover:bg-muted/50 border-l-4 border-l-transparent"
        }`}
        onClick={onToggle}
      >
        <TableCell className="w-[40px] p-2 text-center">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-primary mx-auto" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground mx-auto" />
          )}
        </TableCell>
        <TableCell className="w-[60px] p-2">
          <ProductImage barcode={product.barcode} imageUrl={product.imageUrl} />
        </TableCell>
        <TableCell className={`font-medium ${isExpanded ? "text-primary" : ""}`}>{product.description}</TableCell>
        <TableCell className={`font-mono text-sm ${isExpanded ? "text-primary font-semibold" : ""}`}>{product.barcode}</TableCell>
        <TableCell className="text-right"><Money value={product.salePrice} /></TableCell>
        <TableCell className="text-right">
          <span className={isZeroQuantity(product.stockQuantity) ? "text-destructive font-semibold" : ""}>
            {formatQuantity(product.stockQuantity, product.unitIsFractional)}
          </span>
        </TableCell>
        <TableCell className="text-sm">{product.unitName || "—"}</TableCell>
        <TableCell>
          <Badge variant="outline" className={product.isActive ? "bg-success/15 text-success border-success/30" : "bg-destructive/15 text-destructive border-destructive/30"}>
            {product.isActive ? "Ativo" : "Inativo"}
          </Badge>
        </TableCell>
      </TableRow>
      {isExpanded && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="p-0 border-l-4 border-l-primary bg-primary/5">
            <div className="relative pl-6 pr-4 pb-4 pt-3">
              {/* Conector vertical interno reforçando vínculo pai → filho */}
              <div className="absolute left-2 top-0 bottom-3 w-0.5 bg-primary/40 rounded-full" aria-hidden />

              {/* Header de identificação do produto expandido */}
              <div className="flex flex-wrap items-center gap-2 mb-3 pb-2 border-b border-primary/20">
                <Badge className="bg-primary text-primary-foreground hover:bg-primary text-[10px] uppercase tracking-wider">
                  Detalhes fiscais
                </Badge>
                <span className="text-xs text-muted-foreground">de</span>
                <span className="font-mono text-xs font-semibold text-primary">{product.barcode}</span>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-foreground/80 truncate max-w-[40ch]">{product.description}</span>
              </div>

              {/* Sub-card encapsulando as seções fiscais */}
              <div className="rounded-lg border border-primary/20 bg-card/40 overflow-hidden">
                <ProductFiscalDetails productId={product.id} />
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </Fragment>
  );
}
