import type { ProductPage, ProductQuery } from "../domain/product";
import type { ProductFiscal } from "../domain/product-fiscal";
import type { ProductFiscalIbsCbs } from "../domain/product-fiscal-ibscbs";

/**
 * Porta de acesso a produtos.
 *
 * A UI depende deste contrato, nunca de uma implementação. Quem decide qual implementação usar é
 * `use-product-repository.ts`, a partir do backend ativo (`useRuntime().backend`).
 */
export interface ProductRepository {
  listPage(query: ProductQuery): Promise<ProductPage>;

  /** `null` quando o cadastro fiscal não existe para o produto (comum em item recém-criado). */
  fiscal(productId: string): Promise<ProductFiscal | null>;

  /** A classificação da reforma tributária associada a um `taxReform.taxClassCode`. */
  fiscalIbsCbs(classCode: string): Promise<ProductFiscalIbsCbs>;
}
