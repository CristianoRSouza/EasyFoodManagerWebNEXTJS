import { describe, expect, it } from "vitest";
import { approvedCsvFileName, toApprovedCsv } from "./revenue-csv";
import type { RevenueTransactionRow } from "./revenue";

describe("toApprovedCsv", () => {
  it("gera cabeçalho fixo com BOM e uma linha por transação", () => {
    const rows: RevenueTransactionRow[] = [
      { id: "t1", created_at: "2026-07-01T10:00:00Z", payment_method: "credit", amount: 12.5 },
      { id: "t2", created_at: "2026-07-01T11:30:00Z", payment_method: "pix", amount: 7 },
    ];
    const csv = toApprovedCsv(rows);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("﻿data_hora;forma_pagamento;valor;id");
    expect(lines[1]).toBe(`${new Date(rows[0]!.created_at).toLocaleString("pt-BR")};Crédito;12,50;t1`);
    expect(lines[2]).toBe(`${new Date(rows[1]!.created_at).toLocaleString("pt-BR")};PIX;7,00;t2`);
  });

  it("voucher mostra o tipo fiscal (legado 1.3.12, PR #23)", () => {
    const rows: RevenueTransactionRow[] = [
      { id: "t4", created_at: "2026-07-01T10:00:00Z", payment_method: "meal_voucher", amount: 30 },
      { id: "t5", created_at: "2026-07-01T10:00:00Z", payment_method: "food_voucher", amount: 20 },
    ];
    const csv = toApprovedCsv(rows);
    expect(csv).toContain(";Vale Refeição;30,00;t4");
    expect(csv).toContain(";Vale Alimentação;20,00;t5");
  });

  it("meio de pagamento desconhecido: usa o valor cru", () => {
    const rows: RevenueTransactionRow[] = [
      { id: "t3", created_at: "2026-07-01T10:00:00Z", payment_method: "cash", amount: 1 },
    ];
    expect(toApprovedCsv(rows)).toContain(";cash;1,00;t3");
  });

  it("sem linhas: só o cabeçalho", () => {
    expect(toApprovedCsv([])).toBe("﻿data_hora;forma_pagamento;valor;id\n");
  });
});

describe("approvedCsvFileName", () => {
  it("segue o padrão do legado", () => {
    expect(approvedCsvFileName("2026-06-01", "2026-06-30")).toBe("receitas-aprovadas-tela-2026-06-01-2026-06-30.csv");
  });
});
