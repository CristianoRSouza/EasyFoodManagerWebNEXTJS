import type { IssueBootstrapCodeInput, IssueBootstrapCodeResult } from "../domain/bootstrap-code";

/**
 * Emite códigos de primeiro acesso para a loja do tenant amarrado no construtor da
 * implementação (ver `ApiBootstrapCodeRepository`). Só existe no modo nuvem: quem chama já
 * garantiu isso antes de montar o repositório (ver `ui/BootstrapCodesPage.tsx`).
 */
export interface BootstrapCodeRepository {
  issue(input: IssueBootstrapCodeInput): Promise<IssueBootstrapCodeResult>;
}
