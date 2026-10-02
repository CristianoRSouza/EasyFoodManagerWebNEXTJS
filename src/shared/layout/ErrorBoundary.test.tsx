import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const reporter = vi.hoisted(() => ({ installErrorReporter: vi.fn(), reportError: vi.fn() }));
vi.mock("@/shared/errors/error-reporter", () => reporter);

const { ErrorBoundary } = await import("./ErrorBoundary");

function Boom(): never {
  throw new Error("quebrou");
}

describe("ErrorBoundary", () => {
  it("liga o relator ao montar e envia o erro capturado com a pilha de componentes", () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Algo deu errado")).toBeInTheDocument();
    expect(screen.getByText("Um erro inesperado ocorreu. Um relatório foi enviado automaticamente para análise.")).toBeInTheDocument();
    expect(screen.getByText("quebrou")).toBeInTheDocument();
    expect(reporter.reportError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "quebrou" }),
      { component_stack: expect.stringContaining("Boom") },
    );
  });

  it("sem erro: renderiza os filhos e instala o relator", () => {
    render(
      <ErrorBoundary>
        <p>ok</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("ok")).toBeInTheDocument();
    expect(reporter.installErrorReporter).toHaveBeenCalled();
  });
});
