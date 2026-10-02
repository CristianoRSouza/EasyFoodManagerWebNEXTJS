import { asBoolean, asBooleanOrNull, asNumber, asNumberOrNull, asText } from "@/shared/infrastructure/convert";
import type { NfceAcbrConfig, NfceIssuerConfig } from "../domain/nfce-issuer-config";

type Row = Record<string, unknown>;

/**
 * Linha de `GET /v1/nfce/issuer-config` → domínio.
 *
 * A API (`mapIssuerRowToClient`) já remove os segredos em claro antes de responder; este mapper
 * só converte tipos (Postgres devolve `numeric`/`integer` como texto ou número, conforme a coluna)
 * — não reintroduz nem inventa nenhum segredo. Campos obrigatórios no banco (`cnpj`, `company_name`,
 * `street`, `neighborhood`, `municipality_code`, `municipality_name`, `uf`, `zip_code`,
 * `state_registration`, `number`) caem em `""` só como rede de segurança caso a API mude sem aviso —
 * hoje sempre vêm preenchidos.
 */
export function toNfceIssuerConfig(row: Row): NfceIssuerConfig {
  return {
    id: asText(row.id) ?? "",
    cnpj: asText(row.cnpj) ?? "",
    companyName: asText(row.company_name) ?? "",
    tradeName: asText(row.trade_name),
    stateRegistration: asText(row.state_registration) ?? "",
    stateRegistrationSt: asText(row.state_registration_st),
    municipalRegistration: asText(row.municipal_registration),
    cnae: asText(row.cnae),
    taxRegimeCode: asNumberOrNull(row.tax_regime_code),
    phone: asText(row.phone),
    legacyLojaId: asNumberOrNull(row.legacy_loja_id),
    pisCofinsRegimeCode: asNumberOrNull(row.pis_cofins_regime_code),

    street: asText(row.street) ?? "",
    number: asText(row.number) ?? "",
    complement: asText(row.complement),
    neighborhood: asText(row.neighborhood) ?? "",
    municipalityCode: asText(row.municipality_code) ?? "",
    municipalityName: asText(row.municipality_name) ?? "",
    uf: asText(row.uf) ?? "",
    zipCode: asText(row.zip_code) ?? "",
    countryCode: asText(row.country_code),
    countryName: asText(row.country_name),

    environment: asNumber(row.environment),
    nfceSerie: asNumberOrNull(row.nfce_serie),
    nfeSerie: asNumberOrNull(row.nfe_serie),
    nfceSecurityCode: asText(row.nfce_security_code),
    nfceSecurityCodeId: asText(row.nfce_security_code_id),

    isActive: asBoolean(row.is_active),
    notes: asText(row.notes),
    createdAt: asText(row.created_at) ?? "",
    updatedAt: asText(row.updated_at) ?? "",

    infAdFbConfig250: asText(row.inf_ad_fb_config_250),
    infAdFbConfig251: asText(row.inf_ad_fb_config_251),

    aditumTefPartnerToken: asText(row.aditum_tef_partner_token),
    aditumTefPartnerTokenEncryptedSet: asBoolean(row.aditum_tef_partner_token_encrypted_set),
    aditumTefActivationCode: asText(row.aditum_tef_activation_code),
    aditumTefActivationCodeEncryptedSet: asBoolean(row.aditum_tef_activation_code_encrypted_set),
    issuerSensitiveSecretsReady: asBooleanOrNull(row.issuer_sensitive_secrets_ready),

    tefAdminHttpBaseUrl: asText(row.tef_admin_http_base_url),
    tefAdminHttpApiKey: asText(row.tef_admin_http_api_key),
    tefAdminHttpApiKeySet: asBoolean(row.tef_admin_http_api_key_set),

    companyIdEasyerp: asText(row.companyid_easyerp),
    storeIdEasyerp: asText(row.storeid_easyerp),
    apikeyEasyerp: asText(row.apikey_easyerp),
    easyerpApiKeySet: asBoolean(row.easyerp_api_key_set),
    easyerpApiKeyOrigem: row.easyerp_api_key_origem === "nuvem" || row.easyerp_api_key_origem === "loja" ? row.easyerp_api_key_origem : null,

    certificateHolderName: asText(row.certificate_holder_name),
    certificateHolderCnpj: asText(row.certificate_holder_cnpj),
    certificateAuthorityName: asText(row.certificate_authority_name),
    certificateSeries: asText(row.certificate_series),
    certificateType: asNumberOrNull(row.certificate_type),
    certificatePfxRelativePath: asText(row.certificate_pfx_relative_path),
    certificateSourcePath: asText(row.certificate_source_path),
    certificateExportedAt: asText(row.certificate_exported_at),
    certificateValidUntil: asText(row.certificate_valid_until),
    cryptoLibraryFlag: asText(row.crypto_library_flag),
    certificateAccessFlag: asText(row.certificate_access_flag),
  };
}

/** Linha de `GET /v1/nfce/acbr-config` → domínio. */
export function toNfceAcbrConfig(row: Row): NfceAcbrConfig {
  return {
    id: asText(row.id) ?? "",
    key: asText(row.key) ?? "",
    value: asText(row.value) ?? "",
    description: asText(row.description),
    updatedAt: asText(row.updated_at) ?? "",
  };
}
