"use client";

import { useQuery } from "@tanstack/react-query";
import { useRuntime } from "@/shared/runtime/runtime-context";
import { useRequiredTenant } from "@/shared/tenant/use-required-tenant";
import { useOrderRepository } from "./use-order-repository";

/**
 * Fotos dos produtos presentes nos itens do período — só na nuvem, como no legado
 * (`productImagesQuery` em `Orders.tsx`): os itens da EasyFoodAPI não trazem a foto, e na loja
 * ela vem do servidor de imagens, por barcode.
 */
export function useOrderItemImagesQuery(productIds: string[]) {
  const { backend } = useRuntime();
  const tenant = useRequiredTenant();
  const repository = useOrderRepository();
  const key = productIds.join(",");

  return useQuery({
    queryKey: ["order-item-product-images", tenant.companyId, tenant.storeId, key],
    queryFn: () => repository.listProductImages(productIds),
    enabled: backend === "cloud" && productIds.length > 0,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}
