import { describe, expect, it } from "vitest";
import {
  toMirrorAlarms,
  toMirrorCycleHistory,
  toMirrorCycles,
  toMirrorEvents,
  toMirrorHealth,
  toMirrorJobAggregates,
  toMirrorJobStatsResult,
  toMirrorQueues,
  toMirrorRecordChanges,
  toMirrorRetention,
} from "./sync-mirror-mapper";

describe("mapper do Espelho FB↔PG (formato de fio da easyfoodmanagerAPI)", () => {
  it("saúde: colunas em português → domínio; data null → null", () => {
    expect(
      toMirrorHealth({
        ultimo_ping: "2026-09-30T12:00:00Z",
        inicio_janela: "2026-09-30T11:20:00Z",
        segundos_desde_ping: 3.2,
        heartbeats_retidos: 500,
        ciclos_5min: 60,
        duracao_media_s: 0.61,
        duracao_max_s: null,
      }),
    ).toEqual({
      lastPing: "2026-09-30T12:00:00Z",
      windowStart: "2026-09-30T11:20:00Z",
      secondsSincePing: 3.2,
      heartbeatsRetained: 500,
      cyclesLast5Min: 60,
      avgDurationS: 0.61,
      maxDurationS: null,
    });
    expect(toMirrorHealth(null)).toBeNull();
  });

  it("ciclos, agregados, eventos e alarmes; lista inválida vira []", () => {
    expect(
      toMirrorCycles([
        { id: 7, last_ping: "t", ping_anterior: null, duracao_s: 0.5, linhas_log: 2, registros_afetados: 3, erros: 0 },
      ]),
    ).toEqual([
      { id: "7", lastPing: "t", previousPing: null, durationS: 0.5, logLines: 2, recordsAffected: 3, errors: 0 },
    ]);
    expect(
      toMirrorJobAggregates([
        { direcao: "fb_to_pg", tabela: "products", linhas: 1, registros_afetados: 2, erros: 0, ultimo: "t" },
      ]),
    ).toEqual([{ direction: "fb_to_pg", table: "products", lines: 1, recordsAffected: 2, errors: 0, last: "t" }]);
    expect(
      toMirrorEvents([
        {
          id: "9",
          created_at: "t",
          direcao: "pg_to_fb",
          tabela: "orders",
          registros_afetados: 1,
          record_id: null,
          status: "success",
          mensagem: null,
        },
      ]),
    ).toEqual([
      {
        id: "9",
        createdAt: "t",
        direction: "pg_to_fb",
        table: "orders",
        recordsAffected: 1,
        recordId: null,
        status: "success",
        message: null,
      },
    ]);
    expect(
      toMirrorAlarms([{ direcao: "d", tabela: "x", resumo: "falha", ocorrencias: 4, primeiro: "a", ultimo: "b" }]),
    ).toEqual([{ direction: "d", table: "x", summary: "falha", occurrences: 4, first: "a", last: "b" }]);
    expect(toMirrorCycles(null)).toEqual([]);
    expect(toMirrorEvents({ data: [] })).toEqual([]);
  });

  it("rollup de jobs: bigint em texto vira número; resposta sem objeto = indisponível", () => {
    expect(
      toMirrorJobStatsResult({
        disponivel: true,
        linhas: [
          {
            direcao: "fb_to_pg",
            tabela: "products",
            ciclos: 60,
            lidos: "6900",
            gravados: 0,
            inalterados: "6900",
            erros: 0,
            ultimo_minuto: "t",
          },
        ],
      }),
    ).toEqual({
      available: true,
      rows: [
        {
          direction: "fb_to_pg",
          table: "products",
          cycles: 60,
          read: 6900,
          written: 0,
          unchanged: 6900,
          errors: 0,
          lastMinute: "t",
        },
      ],
    });
    expect(toMirrorJobStatsResult(null)).toEqual({ available: false, rows: [] });
  });

  it("filas: blocos nulos continuam nulos; detalhe das comandas travadas", () => {
    expect(
      toMirrorQueues({
        limiar_travada_min: 10,
        itens: { total: 2, comandas: 1, mais_antigo: "a" },
        estornos: null,
        fechamentos: { total: 1, mais_antigo: "b", travadas: 1, com_falha: 0, max_tentativas: 3 },
        fechamentos_detalhe: [{ barcode: "000123", pedido_em: "b", tentativas: 3, espera_s: 900 }],
      }),
    ).toEqual({
      stuckThresholdMin: 10,
      items: { total: 2, orders: 1, oldest: "a" },
      reversals: null,
      closings: { total: 1, oldest: "b", stuck: 1, failed: 0, maxAttempts: 3 },
      closingDetails: [{ barcode: "000123", requestedAt: "b", attempts: 3, waitS: 900 }],
    });
    expect(toMirrorQueues(null)).toBeNull();
  });

  it("histórico longo: usa o bucket pedido quando a API não responde objeto", () => {
    expect(toMirrorCycleHistory(null, 15)).toEqual({ available: false, bucketMin: 15, rows: [] });
    expect(
      toMirrorCycleHistory(
        {
          disponivel: true,
          bucket_min: 15,
          linhas: [{ balde: "t", ciclos: 180, media_ms: 600, max_ms: 1900, min_ms: null, lentos: 0 }],
        },
        15,
      ),
    ).toEqual({
      available: true,
      bucketMin: 15,
      rows: [{ bucket: "t", cycles: 180, avgMs: 600, maxMs: 1900, minMs: null, slow: 0 }],
    });
  });

  it("alterações: de/para por coluna; entidade com segredo sem detalhe; jsonb em texto", () => {
    const result = toMirrorRecordChanges({
      disponivel: true,
      linhas: [
        {
          id: "1",
          changed_at: "t",
          direcao: "fb_to_pg",
          entidade: "products",
          chave: "7891",
          record_id: null,
          op: "update",
          rotulo: "Coca",
          campos: ["sale_price"],
          detalhe: { sale_price: { de: 6, para: 9 } },
        },
        {
          id: "2",
          changed_at: "t",
          direcao: "fb_to_pg",
          entidade: "nfce_issuer_config",
          chave: "1",
          record_id: null,
          op: "update",
          rotulo: null,
          campos: '["apikey_easyerp"]',
          detalhe: null,
        },
      ],
    });
    expect(result.available).toBe(true);
    expect(result.rows[0]).toMatchObject({ key: "7891", label: "Coca", detail: { sale_price: { from: 6, to: 9 } } });
    expect(result.rows[1]).toMatchObject({ fields: ["apikey_easyerp"], detail: null, label: null });
    expect(toMirrorRecordChanges(null)).toEqual({ available: false, rows: [] });
  });

  it("retenção: gatilho 035 como booleano; mudanças nulas sem a migração 053", () => {
    expect(
      toMirrorRetention({
        log_linhas: 8000,
        log_mais_antigo: "a",
        log_mais_recente: "b",
        heartbeat_linhas: 500,
        heartbeat_mais_antigo: "c",
        gatilho_035_ativo: false,
        mudancas_linhas: null,
        mudancas_mais_antiga: null,
      }),
    ).toEqual({
      logLines: 8000,
      logOldest: "a",
      logNewest: "b",
      heartbeatLines: 500,
      heartbeatOldest: "c",
      trigger035Active: false,
      changesLines: null,
      changesOldest: null,
    });
    expect(toMirrorRetention(null)).toBeNull();
  });
});
