/**
 * Ambiente da instalação (produção x homologação) — equivalente do `runtime-config.ts` do legado
 * 1.3.12 (PR #48). Lá o valor vinha do `/config.js` gerado pelo container ao subir; aqui vem de
 * `EASYFOOD_AMBIENTE`, lido SÓ no servidor (`server/config.ts`) e entregue às telas pelo
 * `RuntimeProvider`. A mesma imagem roda nos dois ambientes sem recompilar.
 */
export type Ambiente = "producao" | "homolog";

/** Supabase PÚBLICO do ambiente (URL + chave publicável) — só a tela de redefinição de senha usa. */
export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

/** Igual ao legado: só `"homolog"` liga a homologação; desconhecido nunca vira homolog por acidente. */
export function resolveAmbiente(raw: string | undefined): Ambiente {
  return raw?.trim() === "homolog" ? "homolog" : "producao";
}

export const HOMOLOG_TITLE_PREFIX = "[HOMOLOGAÇÃO] ";

/** Título da aba: em homologação ganha o prefixo do legado (`AmbienteBanner`), uma vez só. */
export function titleForAmbiente(title: string, ambiente: Ambiente): string {
  if (ambiente !== "homolog" || title.startsWith(HOMOLOG_TITLE_PREFIX)) return title;
  return HOMOLOG_TITLE_PREFIX + title;
}
