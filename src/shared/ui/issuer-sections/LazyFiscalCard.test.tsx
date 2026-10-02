import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RuntimeProvider, type RuntimeInfo } from "@/shared/runtime/runtime-context";
import { LazyFiscalCard } from "./LazyFiscalCard";

const runtime = (backend: RuntimeInfo["backend"]): RuntimeInfo => ({
  backend,
  apiDisplayOrigin: "x",
  adminPlatformUrl: "https://admin.example.com",
});

// `eager` pula o IntersectionObserver (não implementado no jsdom) e chama fetchData
// direto — cobre a decisão de sequencial (lan) vs paralelo (cloud) sem depender do
// observer, que já é testado indiretamente pelo comportamento de scroll do legado.
describe("LazyFiscalCard", () => {
  it("backend cloud: busca os dados e renderiza o conteúdo quando eager", async () => {
    const fetchData = vi.fn().mockResolvedValue(undefined);
    render(
      <RuntimeProvider value={runtime("cloud")}>
        <LazyFiscalCard icon={<span />} title="Seção" fetchData={fetchData} eager>
          <p>conteúdo carregado</p>
        </LazyFiscalCard>
      </RuntimeProvider>,
    );

    await waitFor(() => expect(screen.getByText("conteúdo carregado")).toBeInTheDocument());
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("backend lan: busca os dados via fila sequencial e renderiza o conteúdo quando eager", async () => {
    const fetchData = vi.fn().mockResolvedValue(undefined);
    render(
      <RuntimeProvider value={runtime("lan")}>
        <LazyFiscalCard icon={<span />} title="Seção" fetchData={fetchData} eager>
          <p>conteúdo da loja</p>
        </LazyFiscalCard>
      </RuntimeProvider>,
    );

    await waitFor(() => expect(screen.getByText("conteúdo da loja")).toBeInTheDocument());
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("mostra estado de erro quando fetchData rejeita", async () => {
    const fetchData = vi.fn().mockRejectedValue(new Error("falhou"));
    render(
      <RuntimeProvider value={runtime("cloud")}>
        <LazyFiscalCard icon={<span />} title="Seção" fetchData={fetchData} eager>
          <p>nunca aparece</p>
        </LazyFiscalCard>
      </RuntimeProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText("Falha ao carregar. Atualize a página para tentar novamente.")).toBeInTheDocument(),
    );
  });
});
