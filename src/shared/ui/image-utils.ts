"use client";

import { useRuntime } from "@/shared/runtime/runtime-context";

const IMAGE_SERVER_PORT = 3001;

/**
 * Resolve a URL pública da foto de um produto a partir do backend ativo.
 *
 * - **Loja (LAN)**: servidor de imagens local em `http://{host}:3001/images/{barcode}.jpg`, no
 *   mesmo host do backend (`apiDisplayOrigin`, ex.: `"192.168.0.10:4999"` → host `192.168.0.10`).
 * - **Nuvem**: a API já entrega `imageUrl` como URL pública absoluta — diferente do legado, o
 *   navegador nunca fala com o Supabase Storage diretamente (removido desta migração). Valores
 *   inválidos legados (vazio ou só a extensão, ex.: ".jpg") não geram request.
 */
export function resolveProductImageUrl(params: {
  backend: "cloud" | "lan";
  apiDisplayOrigin: string;
  barcode: string;
  imageUrl?: string | null;
}): string {
  const { backend, apiDisplayOrigin, barcode, imageUrl } = params;

  if (backend === "cloud") {
    if (!imageUrl) return "";
    const trimmed = imageUrl.trim();
    // Valores inválidos legados: apenas a extensão (".jpg", ".JPG", ".png", …) ou string vazia.
    if (!trimmed || /^\.[a-z]+$/i.test(trimmed)) return "";
    return trimmed;
  }

  const host = apiDisplayOrigin.split(":")[0] || "127.0.0.1";
  return `http://${host}:${IMAGE_SERVER_PORT}/images/${barcode}.jpg`;
}

/** Mesma resolução de {@link resolveProductImageUrl}, lendo o backend ativo do `RuntimeProvider`. */
export function useProductImageUrl(barcode: string, imageUrl?: string | null): string {
  const { backend, apiDisplayOrigin } = useRuntime();
  return resolveProductImageUrl({ backend, apiDisplayOrigin, barcode, imageUrl });
}
