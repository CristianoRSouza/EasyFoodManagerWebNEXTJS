import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ErrorSummary } from "./ErrorSummary";
import { PayloadDetails } from "./PayloadDetails";

describe("ErrorSummary", () => {
  it("sem erro não renderiza nada", () => {
    const { container } = render(<ErrorSummary error="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra categoria, SQLSTATE, campos extraídos, dicas e a mensagem original", () => {
    const raw = 'null value in column "store_id" violates not-null constraint (SQLSTATE 23502)';
    render(<ErrorSummary error={raw} />);
    expect(screen.getByText("Campo obrigatório nulo")).toBeInTheDocument();
    expect(screen.getByText("SQLSTATE 23502")).toBeInTheDocument();
    expect(screen.getByText("Coluna")).toBeInTheDocument();
    expect(screen.getByText("store_id")).toBeInTheDocument();
    expect(screen.getByText("Possíveis causas / próximos passos")).toBeInTheDocument();
    expect(screen.getByText("Mensagem original do Postgres")).toBeInTheDocument();
    expect(screen.getByText(raw)).toBeInTheDocument();
  });
});

describe("PayloadDetails", () => {
  it("vazios", () => {
    const { rerender } = render(<PayloadDetails data={null} />);
    expect(screen.getByText("Sem payload")).toBeInTheDocument();
    rerender(<PayloadDetails data={[]} />);
    expect(screen.getByText("Lista vazia")).toBeInTheDocument();
    rerender(<PayloadDetails data={{}} />);
    expect(screen.getByText("Vazio")).toBeInTheDocument();
  });

  it("objeto aninhado e lista viram chave/valor", () => {
    render(<PayloadDetails data={{ ativo: true, itens: [{ qtd: 2 }], cliente: { nome: "Ana" } }} />);
    expect(screen.getByText("ativo")).toBeInTheDocument();
    expect(screen.getByText("Sim")).toBeInTheDocument();
    expect(screen.getByText("Item #1")).toBeInTheDocument();
    expect(screen.getByText("qtd")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("primitivo solto", () => {
    render(<PayloadDetails data={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});
