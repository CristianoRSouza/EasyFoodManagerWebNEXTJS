import { QueryClient, type InfiniteData } from "@tanstack/react-query";
import { keepOnlyFirstPage } from "./keep-only-first-page";

describe("keepOnlyFirstPage", () => {
  it("mantém só a primeira página e o seu parâmetro", () => {
    const client = new QueryClient();
    client.setQueryData<InfiniteData<string[], number>>(["k"], { pages: [["a"], ["b"], ["c"]], pageParams: [0, 20, 40] });

    keepOnlyFirstPage(client, ["k"]);

    expect(client.getQueryData(["k"])).toEqual({ pages: [["a"]], pageParams: [0] });
  });

  it("não cria cache para uma consulta que ainda não carregou", () => {
    const client = new QueryClient();
    keepOnlyFirstPage(client, ["vazio"]);
    expect(client.getQueryData(["vazio"])).toBeUndefined();
  });
});
