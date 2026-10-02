import { describe, expect, it } from "vitest";
import { parseSyncApplyError } from "./sync-apply-error";

describe("parseSyncApplyError", () => {
  it("FK por SQLSTATE, com tabela referenciada e dica de certificate_store", () => {
    const p = parseSyncApplyError(
      'insert or update on table "certificate_store" violates foreign key constraint "fk_issuer" (SQLSTATE 23503)\nDETAIL: Key (issuer_id)=(7) is not present in table "issuer_config".',
      "nfce.certificate_store",
    );
    expect(p.category).toBe("foreign_key");
    expect(p.categoryLabel).toBe("Dependência ausente (FK)");
    expect(p.sqlstate).toBe("23503");
    expect(p.table).toBe("certificate_store");
    expect(p.constraint).toBe("fk_issuer");
    expect(p.referencedTable).toBe("issuer_config");
    expect(p.detail).toBe('Key (issuer_id)=(7) is not present in table "issuer_config".');
    expect(p.hints).toEqual([
      "Falta sincronizar primeiro a tabela referenciada: issuer_config.",
      "nfce.certificate_store costuma depender de nfce.issuer_config (mesmo issuer_id) já estar aplicado.",
      "O evento será reprocessado quando a dependência estiver presente.",
    ]);
  });

  it("FK por texto, sem tabela referenciada", () => {
    const p = parseSyncApplyError("violates foreign key something");
    expect(p.category).toBe("foreign_key");
    expect(p.sqlstate).toBeUndefined();
    expect(p.hints[0]).toBe(
      "Algum registro relacionado ainda não chegou. Verifique a ordem de aplicação dos eventos pais.",
    );
    expect(p.hints).toHaveLength(2);
  });

  it("unique com constraint", () => {
    const p = parseSyncApplyError('duplicate key value violates unique constraint "orders_pkey"');
    expect(p.category).toBe("unique");
    expect(p.hints).toContain("Constraint violada: orders_pkey.");
  });

  it("not null com coluna", () => {
    const p = parseSyncApplyError('null value in column "store_id" violates not-null constraint');
    expect(p.category).toBe("not_null");
    expect(p.column).toBe("store_id");
    expect(p.hints).toEqual([
      'A coluna "store_id" é obrigatória mas veio vazia no payload.',
      "Verifique se o produtor (PG local) está enviando o campo.",
    ]);
  });

  it("tabela/coluna inexistente, permissão, sintaxe e check por texto", () => {
    expect(parseSyncApplyError('relation "x" does not exist').category).toBe("undefined_table");
    expect(parseSyncApplyError('column "y" does not exist').category).toBe("undefined_column");
    expect(parseSyncApplyError("permission denied for table z").category).toBe("permission");
    expect(parseSyncApplyError("syntax error at or near")).toMatchObject({ category: "syntax", hints: [] });
    expect(parseSyncApplyError("new row violates check constraint")).toMatchObject({
      category: "check",
      categoryLabel: "Restrição CHECK",
    });
  });

  it("SQLSTATE vence o texto; 'code: 42501' também é lido", () => {
    expect(parseSyncApplyError("syntax error (SQLSTATE 42P01)").category).toBe("undefined_table");
    expect(parseSyncApplyError("code: 42501").category).toBe("permission");
  });

  it("desconhecido", () => {
    const p = parseSyncApplyError("");
    expect(p.category).toBe("unknown");
    expect(p.categoryLabel).toBe("Erro não classificado");
    expect(p.hints).toEqual(["Erro não reconhecido — leia a mensagem completa abaixo."]);
  });
});
