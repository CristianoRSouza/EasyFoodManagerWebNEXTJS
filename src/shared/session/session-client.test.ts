import { ApiError } from "@/shared/http/api-error";
import { sessionClient } from "./session-client";

const fetchMock = vi.spyOn(globalThis, "fetch");
afterAll(() => fetchMock.mockRestore());

describe("sessionClient.login", () => {
  it("401 com corpo JSON vira ApiError com o código e a mensagem do servidor", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: "invalid_credentials", message: "Email ou senha incorretos." }), { status: 401 }));
    const error = await sessionClient.login("a@b", "x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: "invalid_credentials", message: "Email ou senha incorretos." });
  });

  it("401 sem corpo JSON cai na mensagem padrão", async () => {
    fetchMock.mockResolvedValue(new Response("<html/>", { status: 401 }));
    await expect(sessionClient.login("a@b", "x")).rejects.toMatchObject({ status: 401, code: "http_401", message: "Email ou senha incorretos." });
  });
});
