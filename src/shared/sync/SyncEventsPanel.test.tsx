import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SyncEventsPanel, type SyncEventsPanelProps } from "./SyncEventsPanel";
import type { PanelRecentEvent, SyncEventsPanelFetchers } from "./sync-events-types";

const toastMock = vi.fn();
vi.mock("@/shared/ui/use-toast", () => ({ useToast: () => ({ toast: toastMock }) }));

function event(i: number, over: Partial<PanelRecentEvent> = {}): PanelRecentEvent {
  return {
    event_id: `evt-${String(i).padStart(4, "0")}-aaaa`,
    entity_name: "public.orders",
    entity_id: `ord-${i}`,
    op: "update",
    status: "applied",
    retry_count: 0,
    applied_at: "2026-09-30T10:00:00Z",
    received_at: "2026-09-30T09:59:00Z",
    apply_error: "",
    payload: { total: 10 },
    ...over,
  };
}

function makeFetchers(over: Partial<SyncEventsPanelFetchers> = {}): SyncEventsPanelFetchers {
  return {
    summary: vi.fn(async () => ({ pending_novos: 4, pending_em_retry: 2, success_total: 90, failed_terminal: 1, total: 97 })),
    byEntity: vi.fn(async () => []),
    failures: vi.fn(async () => []),
    activeRetries: vi.fn(async () => []),
    backlog: vi.fn(async () => []),
    recentFailures: vi.fn(async () => []),
    rate: vi.fn(async () => [{ minuto: "a", por_minuto: 3 }, { minuto: "b", por_minuto: 4 }]),
    recentAll: vi.fn(async () => [
      event(1),
      event(2, { status: "failed", retry_count: 5, apply_error: "boom (SQLSTATE 23505)" }),
    ]),
    ...over,
  };
}

function renderPanel(over: Partial<SyncEventsPanelProps> = {}) {
  const props: SyncEventsPanelProps = {
    description: "Descrição da aba",
    successStatusKey: "applied",
    successLabel: "Aplicados",
    rateLabel: "Aplicados (60min)",
    recentTitle: "Últimos eventos recebidos",
    refreshSuccessMsg: "Inbox recarregado.",
    loadingLabel: "Carregando inbox...",
    fetchers: makeFetchers(),
    ...over,
  };
  render(<SyncEventsPanel {...props} />);
  return props;
}

beforeEach(() => toastMock.mockReset());

describe("SyncEventsPanel", () => {
  it("mostra o loading e depois KPIs, soma da taxa e eventos", async () => {
    const props = renderPanel();
    expect(screen.getByText("Carregando inbox...")).toBeInTheDocument();
    expect(await screen.findByText("Descrição da aba")).toBeInTheDocument();
    expect(screen.getByText("Pendentes novos")).toBeInTheDocument();
    expect(screen.getByText("90")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(screen.getByText("Aplicados (60min)")).toBeInTheDocument();
    expect(screen.getByText("(2 carregados)")).toBeInTheDocument();
    expect(screen.getAllByText("Sem registros")).toHaveLength(2);
    expect(screen.getAllByText("Sem backlog 🎉")).toHaveLength(2);
    expect(screen.getByText("Fim da lista")).toBeInTheDocument();
    expect(props.fetchers.activeRetries).toHaveBeenCalledWith(100);
    expect(props.fetchers.recentFailures).toHaveBeenCalledWith(30);
    expect(props.fetchers.recentAll).toHaveBeenCalledWith(50, 0);
  });

  it("falha do summary vira card de erro; falha das outras consultas é ignorada", async () => {
    renderPanel({
      fetchers: makeFetchers({
        summary: vi.fn(async () => { throw new Error("sem conexão"); }),
        backlog: vi.fn(async () => { throw new Error("x"); }),
      }),
    });
    expect(await screen.findByText("Erro ao carregar dados")).toBeInTheDocument();
    expect(screen.getByText("sem conexão")).toBeInTheDocument();
    expect(screen.queryByText("Pendentes novos")).not.toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("Atualizar dados recarrega e mostra o toast de sucesso", async () => {
    const props = renderPanel();
    fireEvent.click(await screen.findByRole("button", { name: /Atualizar dados/ }));
    await waitFor(() =>
      expect(toastMock).toHaveBeenCalledWith({ title: "Dados atualizados", description: "Inbox recarregado." }),
    );
    expect(props.fetchers.summary).toHaveBeenCalledTimes(2);
  });

  it("expandir mostra detalhe, resumo do erro e payload", async () => {
    renderPanel();
    await screen.findByText("Descrição da aba");
    const rows = screen.getAllByRole("button", { expanded: false });
    fireEvent.click(rows[1]!);
    expect(screen.getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(screen.getByText("Violação de unicidade")).toBeInTheDocument();
    expect(screen.getByText("Aplicado")).toBeInTheDocument();
    expect(screen.getByText("total")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { expanded: true }));
    expect(screen.queryByText("Violação de unicidade")).not.toBeInTheDocument();
  });

  it("sem onResetInboxToPending não há botão de reenfileirar", async () => {
    renderPanel();
    await screen.findByText("Descrição da aba");
    expect(screen.queryByLabelText("Reenfileirar evento para reprocessar")).not.toBeInTheDocument();
  });

  it("reenfileirar chama a porta, avisa e recarrega sem o toast de atualizado", async () => {
    const onReset = vi.fn(async () => undefined);
    const props = renderPanel({ onResetInboxToPending: onReset });
    await screen.findByText("Descrição da aba");
    const buttons = screen.getAllByLabelText("Reenfileirar evento para reprocessar");
    expect(buttons).toHaveLength(1); // só o evento failed
    fireEvent.click(buttons[0]!);
    await waitFor(() => expect(onReset).toHaveBeenCalledWith("evt-0002-aaaa"));
    await waitFor(() => expect(props.fetchers.summary).toHaveBeenCalledTimes(2));
    expect(toastMock).toHaveBeenCalledWith({
      title: "Reenfileirado",
      description: "O evento voltou para pending e será reprocessado pelo serviço de sync.",
    });
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ title: "Dados atualizados" }));
    // clicar no botão não expande a linha
    expect(screen.queryByRole("button", { expanded: true })).not.toBeInTheDocument();
  });

  it("página cheia habilita Carregar mais, que pede o próximo offset", async () => {
    const page = Array.from({ length: 50 }, (_, i) => event(i));
    const recentAll = vi.fn(async (_limit: number, offset: number) => (offset === 0 ? page : [event(99)]));
    renderPanel({ fetchers: makeFetchers({ recentAll }) });
    fireEvent.click(await screen.findByRole("button", { name: "Carregar mais" }));
    await waitFor(() => expect(recentAll).toHaveBeenCalledWith(50, 50));
    expect(await screen.findByText("(51 carregados)")).toBeInTheDocument();
    expect(screen.getByText("Fim da lista")).toBeInTheDocument();
  });
});
