import type { NfceIssuerConfig } from "./nfce-issuer-config";

/**
 * Rascunho de edição do emitente — chaves em snake_case, as MESMAS colunas que
 * `PATCH /v1/nfce/issuer-config/:id` aceita (`easyfoodmanagerAPI/src/routes/v1/nfce-issuer-config.ts
 * #PATCHABLE_COLUMNS` + `#PLAIN_SECRET_KEYS`). Usar o nome de coluna direto (em vez de mapear para
 * camelCase e voltar) é o que permite ao formulário (`EditableInfoRow`) usar `field="cnpj"` etc.
 * idêntico ao legado (`LEGACY/src/pages/NfceIssuerConfigPage.tsx#editData`).
 */
export type IssuerEditDraft = Record<string, string>;

/** Colunas numéricas — vazio vira `null`, preenchido vira `parseInt`. Igual a `numericFields` do legado. */
export const ISSUER_NUMERIC_FIELDS = new Set([
  "tax_regime_code",
  "environment",
  "nfce_serie",
  "nfe_serie",
  "legacy_loja_id",
  "pis_cofins_regime_code",
  "certificate_type",
]);

/**
 * Campos de segredo do emitente (invariante 2 — `.claude/rules/seguranca.md`):
 * `aditum_tef_partner_token`/`aditum_tef_activation_code`/`apikey_easyerp` são cifrados
 * (`enc:v1:` AES-256-GCM) pela API; `certificate_password` é gravado em texto na coluna, mas a API
 * nunca o devolve ao browser (`mapIssuerRowToClient` remove os quatro antes de responder).
 *
 * `tef_admin_http_api_key` (o `X-Api-Key` do serviço TEF) entra no mesmo grupo (Importante 1 da
 * revisão da Fase 3): é uma API key da mesma família das outras, mas hoje a API AINDA manda o
 * valor em claro (`mapIssuerRowToClient` não remove essa coluna — pendência registrada para o
 * repositório da API). Tratá-la aqui como segredo é defesa do lado do Next enquanto a API não
 * muda: o rascunho abre em branco e o PATCH nunca reenvia um valor que o operador não digitou de
 * novo — mesmo que o `GET` continue vazando o valor por enquanto.
 *
 * Como a API nunca manda o valor em claro para os quatro primeiros (e não deveria mandar para
 * este quinto), o formulário SEMPRE abre esses campos em branco — não há como saber, só pelo campo
 * vazio, se o operador quer apagar o segredo ou só não tem o valor para conferir. Por segurança, o
 * rascunho trata "em branco" como "não mexer": só entra no PATCH quando o operador digitar um
 * valor novo. Isso é MAIS seguro que o `handleSave` bruto do legado (que só protegia
 * `apikey_easyerp`, via um ref dedicado — deixar `aditum_tef_partner_token` em branco no legado
 * apagaria o segredo cifrado existente, porque a rota trata "chave presente no corpo, vazia" como
 * "apague"); generalizamos a mesma proteção para os cinco campos.
 */
export const ISSUER_SECRET_FIELDS = new Set([
  "aditum_tef_partner_token",
  "aditum_tef_activation_code",
  "apikey_easyerp",
  "certificate_password",
  "tef_admin_http_api_key",
]);

/**
 * Monta o rascunho inicial de edição a partir do emitente carregado — igual a
 * `NfceIssuerConfigPage#startEditing`. Os campos de segredo (ver `ISSUER_SECRET_FIELDS`) sempre
 * abrem vazios: a API nunca os devolve preenchidos.
 */
export function draftFromConfig(config: NfceIssuerConfig): IssuerEditDraft {
  return {
    cnpj: config.cnpj,
    company_name: config.companyName,
    trade_name: config.tradeName ?? "",
    state_registration: config.stateRegistration,
    state_registration_st: config.stateRegistrationSt ?? "",
    municipal_registration: config.municipalRegistration ?? "",
    cnae: config.cnae ?? "",
    tax_regime_code: config.taxRegimeCode != null ? String(config.taxRegimeCode) : "",
    phone: config.phone ?? "",
    legacy_loja_id: config.legacyLojaId != null ? String(config.legacyLojaId) : "",
    pis_cofins_regime_code: config.pisCofinsRegimeCode != null ? String(config.pisCofinsRegimeCode) : "",

    street: config.street,
    number: config.number,
    complement: config.complement ?? "",
    neighborhood: config.neighborhood,
    municipality_code: config.municipalityCode,
    municipality_name: config.municipalityName,
    uf: config.uf,
    zip_code: config.zipCode,
    country_code: config.countryCode ?? "",
    country_name: config.countryName ?? "",

    environment: String(config.environment),
    // Nula abre vazia e o PATCH manda null — o mesmo efeito do legado (`String(null)` → `parseInt` NaN →
    // `null` no JSON). Antes virava "0" e salvar sem mexer gravaria série 0.
    nfce_serie: config.nfceSerie != null ? String(config.nfceSerie) : "",
    nfe_serie: config.nfeSerie != null ? String(config.nfeSerie) : "",
    nfce_security_code: config.nfceSecurityCode ?? "",
    nfce_security_code_id: config.nfceSecurityCodeId ?? "",

    notes: config.notes ?? "",

    inf_ad_fb_config_250: config.infAdFbConfig250 ?? "",
    inf_ad_fb_config_251: config.infAdFbConfig251 ?? "",

    // Segredos: SEMPRE em branco, incondicionalmente (defesa em profundidade — ver
    // ISSUER_SECRET_FIELDS acima). A API nunca devolve isto em claro (exceto `tef_admin_http_api_key`,
    // pendência na API — Importante 1); mesmo quando o valor chega, o rascunho de edição não o repete
    // no campo.
    aditum_tef_partner_token: "",
    aditum_tef_activation_code: "",
    apikey_easyerp: "",
    certificate_password: "",
    tef_admin_http_api_key: "",

    tef_admin_http_base_url: config.tefAdminHttpBaseUrl ?? "",

    companyid_easyerp: config.companyIdEasyerp ?? "",
    storeid_easyerp: config.storeIdEasyerp ?? "",

    certificate_holder_name: config.certificateHolderName ?? "",
    certificate_holder_cnpj: config.certificateHolderCnpj ?? "",
    certificate_authority_name: config.certificateAuthorityName ?? "",
    certificate_series: config.certificateSeries ?? "",
    certificate_type: config.certificateType != null ? String(config.certificateType) : "",
    certificate_pfx_relative_path: config.certificatePfxRelativePath ?? "",
    certificate_source_path: config.certificateSourcePath ?? "",
    crypto_library_flag: config.cryptoLibraryFlag ?? "",
    certificate_access_flag: config.certificateAccessFlag ?? "",
  };
}

/**
 * Constrói o corpo do `PATCH /v1/nfce/issuer-config/:id` a partir do rascunho — igual à conversão
 * de `handleSave` do legado, com a proteção de segredo generalizada (ver `ISSUER_SECRET_FIELDS`):
 *
 * - Campo de segredo em branco → OMITIDO do corpo (a API só apaga o segredo cifrado quando a
 *   chave está presente no corpo; omitir é o único jeito seguro de dizer "não mexer").
 * - Campo de segredo preenchido → enviado como texto (a API cifra antes de gravar).
 * - Campo numérico (`ISSUER_NUMERIC_FIELDS`) em branco → `null`; preenchido → `parseInt`.
 * - Demais campos em branco → `null`; preenchidos → string.
 */
export function buildIssuerUpdatePayload(draft: IssuerEditDraft): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(draft)) {
    if (ISSUER_SECRET_FIELDS.has(key)) {
      if (value.trim() === "") continue;
      payload[key] = value;
      continue;
    }
    if (ISSUER_NUMERIC_FIELDS.has(key)) {
      payload[key] = value === "" ? null : Number.parseInt(value, 10);
    } else {
      payload[key] = value === "" ? null : value;
    }
  }
  return payload;
}
