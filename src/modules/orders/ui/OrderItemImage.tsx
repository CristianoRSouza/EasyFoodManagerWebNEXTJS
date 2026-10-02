"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { useProductImageUrl } from "@/shared/ui/image-utils";

export function OrderItemImage({ barcode, imageUrl }: { barcode: string; imageUrl?: string | null }) {
  const [error, setError] = useState(false);
  const src = useProductImageUrl(barcode, imageUrl);
  if (error || !src) {
    return (
      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
        <ImageOff className="h-3 w-3 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- foto vem de host dinâmico (loja/nuvem), fora do domínio conhecido do Next/Image
    <img
      src={src}
      alt={barcode}
      className="w-8 h-8 rounded object-cover bg-muted shrink-0"
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
