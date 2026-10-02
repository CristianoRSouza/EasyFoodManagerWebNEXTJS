/*
 * Nomes dos cookies de sessão, fonte única para o proxy e os gateways.
 * Sem "server-only" nem APIs do Node: o proxy.ts roda no runtime de middleware.
 */

/** Gravado pelo próprio Next no modo loja (guarda o JWT da easyfoodmanagerAPI). */
export const LAN_SESSION_COOKIE = "efm_session";

/** Gravado pela EasyFoodAPI na nuvem e só retransmitido. Nome confirmado na homologação em 2026-10-01. */
export const CLOUD_SESSION_COOKIE = "easyfood_session";
