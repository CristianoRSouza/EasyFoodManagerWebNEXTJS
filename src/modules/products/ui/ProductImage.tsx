"use client";

import { useState } from "react";
import { useProductImageUrl } from "@/shared/ui/image-utils";

export function ProductImage({ barcode, imageUrl }: { barcode: string; imageUrl?: string | null }) {
  const [error, setError] = useState(false);
  const src = useProductImageUrl(barcode, imageUrl);
  // Sem URL resolvida (produto sem foto): renderiza espaço vazio sem disparar request.
  if (!src || error) {
    return <div className="w-10 h-10 rounded-lg bg-muted/30" aria-hidden />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- foto de catálogo variável, servida pelo backend ativo (nuvem/loja), não um asset do build.
    <img
      src={src}
      alt={barcode}
      className="w-10 h-10 rounded-lg object-cover bg-muted ring-1 ring-border/50"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
