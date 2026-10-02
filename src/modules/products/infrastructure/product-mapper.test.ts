import { toProduct } from "./product-mapper";

describe("toProduct", () => {
  it("mapeia uma linha completa", () => {
    const product = toProduct({
      id: "p1",
      description: "Coxinha",
      barcode: "789",
      sale_price: "8.5",
      stock_quantity: 10,
      unit_name: "UN",
      image_url: "produto.jpg",
      is_active: true,
    });
    expect(product).toEqual({
      id: "p1",
      description: "Coxinha",
      barcode: "789",
      salePrice: 8.5,
      stockQuantity: 10,
      unitName: "UN",
      unitIsFractional: null,
      imageUrl: "produto.jpg",
      isActive: true,
    });
  });

  it("lê is_fractional da unidade (decide as casas do estoque — legado 1.3.12, PR #30)", () => {
    expect(toProduct({ id: "p3", unit_is_fractional: true }).unitIsFractional).toBe(true);
    expect(toProduct({ id: "p4", unit_is_fractional: false }).unitIsFractional).toBe(false);
  });

  it("converte preço numérico em texto (driver pg) e trata nulos", () => {
    const product = toProduct({
      id: "p2",
      description: "Refrigerante",
      barcode: "111",
      sale_price: "5.90",
      stock_quantity: "0",
      unit_name: null,
      image_url: null,
      is_active: "f",
    });
    expect(product.salePrice).toBe(5.9);
    expect(product.stockQuantity).toBe(0);
    expect(product.unitName).toBeNull();
    expect(product.imageUrl).toBeNull();
    expect(product.isActive).toBe(false);
  });

  it("campos ausentes viram valores seguros, nunca undefined/NaN", () => {
    const product = toProduct({});
    expect(product).toEqual({
      id: "",
      description: "",
      barcode: "",
      salePrice: 0,
      stockQuantity: 0,
      unitName: null,
      unitIsFractional: null,
      imageUrl: null,
      isActive: false,
    });
  });
});
