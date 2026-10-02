import type { InfiniteData, QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Descarta, no cache, todas as páginas de uma consulta infinita menos a primeira.
 *
 * É o "Atualizar dados" do legado nas telas com rolagem infinita: recarregar volta a lista para
 * a 1ª página, em vez de repetir cada página já rolada. Chamado logo antes do `refetch()` — o
 * TanStack Query refaz tantas páginas quantas houver em cache, então sobra só a do offset 0. A
 * lista continua visível enquanto a nova 1ª página chega (sem voltar ao estado "carregando").
 */
export function keepOnlyFirstPage(queryClient: QueryClient, queryKey: QueryKey): void {
  queryClient.setQueryData<InfiniteData<unknown>>(queryKey, (data) =>
    data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
  );
}
