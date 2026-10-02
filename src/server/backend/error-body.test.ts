// @vitest-environment node
import { parseJsonSafely, toErrorBody } from "./error-body";

describe("toErrorBody", () => {
  it("formato da easyfoodmanagerAPI: texto em `error`, código em `error_code`", () => {
    expect(toErrorBody(401, { error: "Senha inválida.", error_code: "invalid_credentials" }))
      .toEqual({ code: "invalid_credentials", message: "Senha inválida." });
  });

  it("formato da EasyFoodAPI: código em `error`, texto em `message`", () => {
    expect(toErrorBody(403, { error: "tenant_forbidden", message: "Sem acesso." }))
      .toEqual({ code: "tenant_forbidden", message: "Sem acesso." });
  });

  it("easyfoodmanagerAPI sem error_code: `error` com espaços é texto humano, não código", () => {
    expect(toErrorBody(401, { error: "Credenciais inválidas." }))
      .toEqual({ code: "http_401", message: "Credenciais inválidas." });
  });

  it("sem error_code e sem message: `error` que parece código vira o próprio code, com mensagem de fallback", () => {
    expect(toErrorBody(403, { error: "tenant_forbidden" }))
      .toEqual({ code: "tenant_forbidden", message: "Falha na requisição (HTTP 403)." });
  });

  it("sem error_code, com `error` humano E `message` preenchidos: o texto humano não vira código (Menor 12)", () => {
    expect(toErrorBody(401, { error: "Credenciais inválidas.", message: "Verifique usuário e senha." }))
      .toEqual({ code: "http_401", message: "Verifique usuário e senha." });
  });

  it("sem error_code, com `error` parecendo código E `message` preenchidos: o código é aproveitado", () => {
    expect(toErrorBody(403, { error: "tenant_forbidden", message: "Sem acesso a esta loja." }))
      .toEqual({ code: "tenant_forbidden", message: "Sem acesso a esta loja." });
  });

  it("corpo que não é objeto vira código http_<status> com mensagem em PT-BR", () => {
    expect(toErrorBody(502, null)).toEqual({ code: "http_502", message: "Falha na requisição (HTTP 502)." });
  });

  it("503 sem mensagem usa o texto de serviço indisponível", () => {
    expect(toErrorBody(503, {})).toEqual({ code: "http_503", message: "Serviço temporariamente indisponível. Tente novamente." });
  });
});

describe("parseJsonSafely", () => {
  it("devolve null para HTML de proxy em vez de lançar", () => {
    expect(parseJsonSafely("<html>Bad Gateway</html>")).toBeNull();
    expect(parseJsonSafely("")).toBeNull();
    expect(parseJsonSafely('{"a":1}')).toEqual({ a: 1 });
  });
});
