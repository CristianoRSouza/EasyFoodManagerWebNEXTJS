export const LOCAL_PASSWORD_MIN_LENGTH = 6;
export const LOCAL_PASSWORD_MAX_LENGTH = 128;

const BOOTSTRAP_ERRORS: Record<string, string> = {
  user_not_found: "Este email não existe nesta base local ou a conta ainda não foi sincronizada.",
  password_already_set: "A senha local já foi definida. Volte e inicie sessão com email e senha.",
  user_inactive: "Usuário inativo. Contacte o administrador do sistema.",
  weak_password: `Senha não cumpre os requisitos (≥ ${LOCAL_PASSWORD_MIN_LENGTH} caracteres).`,
  bootstrap_disabled: "A API não permite este cadastro (ver AUTH_MODE=pg_users no serviço da Admin API).",
  provisioning_code_required:
    "Este servidor exige um código de primeiro acesso. Peça ao administrador para gerar um no painel da nuvem.",
  provisioning_code_invalid: "Código de primeiro acesso inválido. Confira se copiou o código completo.",
  provisioning_code_expired: "Código de primeiro acesso expirado. Peça um novo ao administrador.",
  provisioning_code_email_mismatch: "O código de primeiro acesso pertence a outro email.",
  provisioning_code_wrong_store: "O código de primeiro acesso pertence a outra loja.",
  bootstrap_rate_limited: "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
};

export function bootstrapErrorMessage(code: string | undefined, fallback: string): string {
  return (code && BOOTSTRAP_ERRORS[code]) || fallback;
}

/** Códigos do login local que levam à tela de primeiro acesso. */
export const NEEDS_BOOTSTRAP_CODES = new Set(["local_password_not_set", "invalid_password_hash"]);
