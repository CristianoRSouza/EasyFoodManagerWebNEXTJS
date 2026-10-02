import { describe, expect, it } from "vitest";
import { isValidBootstrapEmail, normalizeBootstrapEmail } from "./bootstrap-code";

describe("isValidBootstrapEmail", () => {
  it("aceita um email simples", () => {
    expect(isValidBootstrapEmail("funcionario@empresa.com")).toBe(true);
  });

  it("aceita maiúsculas e espaços nas pontas (normaliza antes de validar)", () => {
    expect(isValidBootstrapEmail("  Funcionario@Empresa.COM  ")).toBe(true);
  });

  it("rejeita sem @", () => {
    expect(isValidBootstrapEmail("funcionario-empresa.com")).toBe(false);
  });

  it("rejeita sem domínio", () => {
    expect(isValidBootstrapEmail("funcionario@empresa")).toBe(false);
  });

  it("rejeita com espaço no meio", () => {
    expect(isValidBootstrapEmail("funcionario @empresa.com")).toBe(false);
  });

  it("rejeita string vazia", () => {
    expect(isValidBootstrapEmail("")).toBe(false);
  });
});

describe("normalizeBootstrapEmail", () => {
  it("remove espaços das pontas e passa para minúsculas", () => {
    expect(normalizeBootstrapEmail("  Funcionario@Empresa.COM  ")).toBe("funcionario@empresa.com");
  });

  it("não mexe em email já normalizado", () => {
    expect(normalizeBootstrapEmail("funcionario@empresa.com")).toBe("funcionario@empresa.com");
  });
});
