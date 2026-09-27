"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * O ÚNICO ponto do painel que fala com o Supabase: o link de recuperação do e-mail é
 * emitido e validado por ele, e a API não tem rota equivalente.
 */
let client: SupabaseClient | null = null;

function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("A troca de senha precisa de NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  client = createClient(url, key, { auth: { persistSession: false, detectSessionInUrl: false } });
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

export async function updatePassword(password: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ password });
  if (error) throw new Error(error.message);
}
