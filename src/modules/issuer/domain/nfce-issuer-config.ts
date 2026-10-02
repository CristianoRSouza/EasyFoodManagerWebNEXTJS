/**
 * Cadastro do emitente da NFC-e — a loja que assina fiscalmente as vendas, o certificado digital
 * instalado, os parâmetros de série/ambiente e as integrações locais (TEF Aditum, EasyERP).
 *
 * Espelha `nfce_issuer_config` (LEGACY `src/lib/mock-data.ts#NfceIssuerConfig`), pelo contrato real
 * de `GET /v1/nfce/issuer-config` (`easyfoodmanagerAPI/src/routes/v1/nfce-issuer-config.ts`).
 *
 * IMPORTANTE (invariante 2 — segredos do emitente nunca em claro): a própria API já remove
 * `aditum_tef_partner_token`, `aditum_tef_activation_code`, `apikey_easyerp` e
 * `certificate_password` da resposta (`mapIssuerRowToClient`), devolvendo só as flags `*Set`. Os
 * três primeiros campos abaixo existem no tipo só porque, em tese, uma resposta poderia trazê-los
 * preenchidos (bug do servidor, ou uma fonte futura que não redija) — a UI nunca deve exibir o
 * valor em si, só decidir "definido"/"—" a partir dele (ver `IssuerTefCard`/`IssuerEasyerpCard`).
 */
export interface NfceIssuerConfig {
  id: string;
  cnpj: string;
  companyName: string;
  tradeName: string | null;
  stateRegistration: string;
  stateRegistrationSt: string | null;
  municipalRegistration: string | null;
  cnae: string | null;
  /** `null` = regime ausente na origem (a tela mostra "—", nunca supõe Regime Normal). */
  taxRegimeCode: number | null;
  phone: string | null;
  legacyLojaId: number | null;
  pisCofinsRegimeCode: number | null;

  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  municipalityCode: string;
  municipalityName: string;
  uf: string;
  zipCode: string;
  countryCode: string | null;
  countryName: string | null;

  environment: number;
  /** Pode vir nula da API (visto na produção, 2026-10-01): não confundir com série 0. */
  nfceSerie: number | null;
  nfeSerie: number | null;
  nfceSecurityCode: string | null;
  nfceSecurityCodeId: string | null;

  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  /** Texto legado Firebird (TBL_CONFIGURACAO 250) → infCpl quando CRT é Simples/MEI. */
  infAdFbConfig250: string | null;
  /** Texto legado Firebird (TBL_CONFIGURACAO 251) → infCpl quando CRT é Simples/MEI. */
  infAdFbConfig251: string | null;

  /** Só em memória se algum dia vier preenchido — nunca renderizado em claro. Ver aviso acima. */
  aditumTefPartnerToken: string | null;
  aditumTefPartnerTokenEncryptedSet: boolean;
  aditumTefActivationCode: string | null;
  aditumTefActivationCodeEncryptedSet: boolean;
  /**
   * Admin API com `SENSITIVE_SECRET_*` válido para (algum dia) descifrar `enc:v1:`. `null` quando
   * a fonte não informa (nuvem) — o aviso de chave ausente só aparece com `false` explícito.
   */
  issuerSensitiveSecretsReady: boolean | null;

  tefAdminHttpBaseUrl: string | null;
  tefAdminHttpApiKey: string | null;
  /** Nuvem: a loja tem X-Api-Key TEF gravada (o valor não sobe). */
  tefAdminHttpApiKeySet: boolean;

  companyIdEasyerp: string | null;
  storeIdEasyerp: string | null;
  /** Idem aditum*: nunca renderizado em claro. */
  apikeyEasyerp: string | null;
  easyerpApiKeySet: boolean;
  /** Nuvem (EasyFood API): de onde vem a chave — emitida pela nuvem ou gravada só na loja. */
  easyerpApiKeyOrigem: "nuvem" | "loja" | null;

  certificateHolderName: string | null;
  certificateHolderCnpj: string | null;
  certificateAuthorityName: string | null;
  certificateSeries: string | null;
  certificateType: number | null;
  certificatePfxRelativePath: string | null;
  certificateSourcePath: string | null;
  certificateExportedAt: string | null;
  certificateValidUntil: string | null;
  cryptoLibraryFlag: string | null;
  certificateAccessFlag: string | null;
}

/**
 * Parâmetro do ACBrLib sincronizado da loja (`nfce_acbr_config`). Na nuvem a EasyFood API entrega
 * o espelho sincronizado pela loja (legado 1.3.12, PR #37).
 */
export interface NfceAcbrConfig {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updatedAt: string;
}

/**
 * Texto do segredo TEF (token partner / código de ativação) na leitura — legado 1.3.12
 * (`tefSegredoDefinido`, PR #38). O valor nunca chega em claro pela API nem pela nuvem: só o
 * indicador `*_encrypted_set`. Mostrar "—" com ele verdadeiro dizia que não havia credencial
 * quando havia. INVARIANTE 2: devolve só a máscara, nunca o valor.
 */
export function tefSecretLabel(plain: string | null | undefined, encryptedSet: boolean | undefined, cloudMode: boolean): string {
  if (!plain?.trim() && !encryptedSet) return "—";
  return cloudMode ? "•••••••• (definido na loja)" : "•••••••• (definido — cifrado na BD)";
}

/** Dias de antecedência em que o vencimento do certificado já merece aviso — igual ao legado. */
const CERTIFICATE_WARNING_DAYS = 30;

/** `true` quando `validUntil` já passou. Sem data, não está expirado (o legado também assume isso). */
export function isCertificateExpired(validUntil: string | null, now: Date = new Date()): boolean {
  if (!validUntil) return false;
  return new Date(validUntil).getTime() < now.getTime();
}

/** Dias restantes até o vencimento (negativo se já venceu); `null` sem data de validade. */
export function certificateDaysLeft(validUntil: string | null, now: Date = new Date()): number | null {
  if (!validUntil) return null;
  return Math.ceil((new Date(validUntil).getTime() - now.getTime()) / 86_400_000);
}

/** `true` quando o certificado está expirado OU vence em menos de 30 dias — variante "destructive" do badge. */
export function isCertificateUrgent(daysLeft: number | null): boolean {
  return daysLeft != null && daysLeft < CERTIFICATE_WARNING_DAYS;
}
