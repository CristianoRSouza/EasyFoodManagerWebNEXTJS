import type { NfceAcbrConfig, NfceIssuerConfig } from "../domain/nfce-issuer-config";

/**
 * Porta de acesso ao cadastro do emitente NFC-e.
 *
 * A UI depende deste contrato, nunca de uma implementação. `use-issuer-repository.ts` decide qual
 * implementação usar a partir do backend ativo (`useRuntime().backend`).
 */
export interface IssuerRepository {
  /** Um item por emitente cadastrado (normalmente 1 — a loja); ordenado como o legado (ativos primeiro, mais recentes primeiro). */
  list(): Promise<NfceIssuerConfig[]>;

  /**
   * Parâmetros do ACBrLib sincronizados da loja.
   *
   * Como no legado (`fetchNfceAcbrConfig`): só existe no modo LAN — sincronizado pelo Firebird
   * local. Fora do LAN, devolve lista vazia sem chamar a API (a loja na nuvem não tem ACBr local).
   */
  acbrConfig(): Promise<NfceAcbrConfig[]>;

  /**
   * Grava o cadastro do emitente — `PATCH /v1/nfce/issuer-config/:id`.
   *
   * `payload` já deve vir de `buildIssuerUpdatePayload` (domínio): colunas snake_case, segredos
   * omitidos quando não digitados de novo (invariante 2). Lança `ApiError` (com `.message` em
   * PT-BR) em caso de falha — quem chama decide como mostrar (toast, etc.), como o legado faz em
   * `handleSave`.
   */
  update(id: string, payload: Record<string, unknown>): Promise<void>;
}
