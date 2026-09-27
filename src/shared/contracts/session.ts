/*
 * Contrato de sessão entre o navegador e o BFF (/api/session/*).
 * Tipos puros, sem imports: usados pelo cliente (shared) e pelos gateways (server).
 */

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface FirstAccessInput {
  email: string;
  newPassword: string;
  provisioningCode?: string;
}
