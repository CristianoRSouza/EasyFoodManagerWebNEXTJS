import { describe, expect, it } from "vitest";
import { resolveProductImageUrl } from "./image-utils";

describe("resolveProductImageUrl", () => {
  describe("nuvem", () => {
    it("devolve a URL absoluta entregue pela API sem alteração", () => {
      const url = resolveProductImageUrl({
        backend: "cloud",
        apiDisplayOrigin: "api.easysoftcloud.com.br",
        barcode: "789123",
        imageUrl: "https://storage.example.com/product-images/789123.jpg",
      });
      expect(url).toBe("https://storage.example.com/product-images/789123.jpg");
    });

    it("string vazia sem imagem", () => {
      expect(
        resolveProductImageUrl({ backend: "cloud", apiDisplayOrigin: "x", barcode: "1", imageUrl: "" }),
      ).toBe("");
    });

    it("ausência de imageUrl (undefined/null) sem imagem", () => {
      expect(resolveProductImageUrl({ backend: "cloud", apiDisplayOrigin: "x", barcode: "1" })).toBe("");
      expect(
        resolveProductImageUrl({ backend: "cloud", apiDisplayOrigin: "x", barcode: "1", imageUrl: null }),
      ).toBe("");
    });

    it("valor legado inválido (apenas extensão) sem imagem", () => {
      expect(
        resolveProductImageUrl({ backend: "cloud", apiDisplayOrigin: "x", barcode: "1", imageUrl: ".jpg" }),
      ).toBe("");
      expect(
        resolveProductImageUrl({ backend: "cloud", apiDisplayOrigin: "x", barcode: "1", imageUrl: ".PNG" }),
      ).toBe("");
    });
  });

  describe("loja (LAN)", () => {
    it("monta a URL do servidor de imagens no host do backend local", () => {
      const url = resolveProductImageUrl({
        backend: "lan",
        apiDisplayOrigin: "192.168.0.10:4999",
        barcode: "789123",
        imageUrl: null,
      });
      expect(url).toBe("http://192.168.0.10:3001/images/789123.jpg");
    });

    it("ignora imageUrl (a foto sempre vem do servidor local pelo código de barras)", () => {
      const url = resolveProductImageUrl({
        backend: "lan",
        apiDisplayOrigin: "127.0.0.1:4999",
        barcode: "555",
        imageUrl: "https://storage.example.com/ignored.jpg",
      });
      expect(url).toBe("http://127.0.0.1:3001/images/555.jpg");
    });

    it("usa 127.0.0.1 quando o host não pode ser lido do apiDisplayOrigin", () => {
      expect(
        resolveProductImageUrl({ backend: "lan", apiDisplayOrigin: "", barcode: "1", imageUrl: null }),
      ).toBe("http://127.0.0.1:3001/images/1.jpg");
    });
  });
});
