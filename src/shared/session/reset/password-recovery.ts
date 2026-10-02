"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { SupabasePublicConfig } from "@/shared/runtime/ambiente";

/**
 * O ÚNICO ponto do painel que fala com o Supabase: o link de recuperação do e-mail é
 * emitido e validado por ele, e a API não tem rota equivalente.
 *
 * O projeto (URL + chave publicável) é o do AMBIENTE em execução — `SUPABASE_URL`/
 * `SUPABASE_PUBLISHABLE_KEY` lidos no servidor e entregues pela página (`configureRecoverySupabase`),
 * não congelados no build: a mesma imagem serve produção e homologação (legado 1.3.12, PR #48).
 */
let config: SupabasePublicConfig | null = null;
let client: SupabaseClient | null = null;

/** Define o Supabase do ambiente. Trocar de projeto descarta o cliente anterior. */
export function configureRecoverySupabase(next: SupabasePublicConfig | null | undefined): void {
  const value = next ?? null;
  if (value?.url === config?.url && value?.publishableKey === config?.publishableKey) return;
  config = value;
  client = null;
}

function supabase(): SupabaseClient {
  if (client) return client;
  if (!config) {
    throw new Error("A troca de senha precisa de SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY no servidor.");
  }
  client = createClient(config.url, config.publishableKey, { auth: { persistSession: false, detectSessionInUrl: false } });
  return client;
}

export type RecoveryLink =
  | { kind: "token_hash"; tokenHash: string }
  | { kind: "session"; accessToken: string; refreshToken: string };

export function readRecoveryLink(search: string, hash: string): RecoveryLink | null {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if ((query.get("type") ?? fragment.get("type")) !== "recovery") return null;
  const tokenHash = query.get("token_hash") ?? fragment.get("token_hash");
  if (tokenHash) return { kind: "token_hash", tokenHash };
  const accessToken = fragment.get("access_token");
  const refreshToken = fragment.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken };
  return null;
}

export async function verifyRecoveryToken(tokenHash: string): Promise<boolean> {
  const { error } = await supabase().auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
  return !error;
}

/** Links antigos (via /auth/v1/verify) já trazem a sessão no hash. */
export async function adoptRecoverySession(accessToken: string, refreshToken: string): Promise<boolean> {
  const { error } = await supabase().auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  return !error;
}

const UPDATE_PASSWORD_FALLBACK = "Falha ao atualizar senha";

/**
 * Traduz mensagens de erro do Supabase Auth (em inglês) para PT-BR amigável.
 * Mesmo mapeamento de `easyfoodmanagerWEB/src/lib/cloud-auth.ts` (`translateAuthError`),
 * restrito ao fallback de `updatePassword` — a UI de recuperação é sempre PT-BR, então,
 * ao contrário do legado, uma mensagem desconhecida cai no fallback em vez de ecoar o
 * texto original (normalmente em inglês).
 */
function translateAuthError(raw: string | undefined): string {
  if (!raw) return UPDATE_PASSWORD_FALLBACK;
  const msg = raw.toLowerCase();

  // Credenciais
  if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
    return "Email ou senha incorretos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Email ainda não confirmado. Verifique a sua caixa de entrada.";
  }
  if (msg.includes("user not found")) {
    return "Usuário não encontrado.";
  }
  if (msg.includes("user already registered") || msg.includes("already been registered")) {
    return "Este email já está registado.";
  }

  // Senha
  if (msg.includes("password should be at least")) {
    return "A senha é demasiado curta. Use pelo menos 6 caracteres.";
  }
  if (msg.includes("new password should be different")) {
    return "A nova senha deve ser diferente da anterior.";
  }
  if (msg.includes("weak password") || msg.includes("password is too weak")) {
    return "Senha demasiado fraca. Combine letras, números e símbolos.";
  }

  // Rate limit / segurança
  if (msg.includes("over_email_send_rate_limit") || msg.includes("email rate limit")) {
    return "Limite de envio de emails atingido. Tente novamente em alguns minutos.";
  }
  if (msg.includes("rate limit") || msg.includes("too many requests")) {
    return "Demasiadas tentativas. Aguarde um momento e tente novamente.";
  }

  // Sessão / token
  if (msg.includes("jwt expired") || msg.includes("token has expired")) {
    return "A sua sessão expirou. Faça login novamente.";
  }
  if (msg.includes("invalid token") || msg.includes("token not found")) {
    return "Link inválido ou expirado. Solicite um novo email de recuperação.";
  }

  // Configuração / chaves
  if (msg.includes("legacy api keys are disabled")) {
    return "Configuração desatualizada do servidor. Contacte o administrador.";
  }
  if (msg.includes("anonymous sign-ins are disabled")) {
    return "Logins anónimos estão desativados.";
  }
  if (msg.includes("signups not allowed") || msg.includes("signup is disabled")) {
    return "Novos registros estão desativados.";
  }

  // Email malformado
  if (msg.includes("unable to validate email") || msg.includes("invalid email")) {
    return "Email inválido. Verifique o formato.";
  }

  // Rede
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Sem ligação ao servidor. Verifique a sua internet.";
  }

  return UPDATE_PASSWORD_FALLBACK;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new Error(translateAuthError(error.message));
}
