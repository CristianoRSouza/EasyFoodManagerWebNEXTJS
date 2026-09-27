const LEGACY_PASSWORD_KEYS = ["password", "ecp_admin_password", "ecp_admin_last_password"];

/**
 * Versões antigas do painel chegaram a gravar a senha em claro no navegador.
 * Limpa esses rastros a cada carregamento da tela de login — a senha nunca
 * deveria ter ficado ali, então não há nada de útil a preservar.
 */
export function purgeLegacyPasswordStorage(): void {
  for (const key of LEGACY_PASSWORD_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* sem armazenamento: nada a limpar */
    }
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* sem armazenamento: nada a limpar */
    }
  }
}
