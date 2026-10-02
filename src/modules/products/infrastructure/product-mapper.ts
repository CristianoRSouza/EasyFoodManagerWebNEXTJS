import { asBoolean, asBooleanOrNull, asNumber, asText } from "@/shared/infrastructure/convert";
import type { Product } from "../domain/product";

type Row = Record<string, unknown>;

/** Traduz uma linha de `/v1/products*` (`snake_case`) para o `Product` do domínio. */
export function toProduct(row: Row): Product {
  return {
    id: asText(row.id) ?? "",
    description: asText(row.description) ?? "",
    barcode: asText(row.barcode) ?? "",
    salePrice: asNumber(row.sale_price),
    stockQuantity: asNumber(row.stock_quantity),
    unitName: asText(row.unit_name),
    unitIsFractional: asBooleanOrNull(row.unit_is_fractional),
    imageUrl: asText(row.image_url),
    isActive: asBoolean(row.is_active),
  };
}
