import type { TotemConfigFormData } from "./totem-config";
import {
  APP_NAME_MAX,
  APP_VERSION_REGEX,
  CLAIM_STATUS_TOKEN_REGEX,
  TOTEM_NAME_REGEX,
  isAditumRuntimeUrl,
  isCnpjAllSameDigit,
  isNfceHttpUrl,
} from "./totem-form";

/**
 * `validateTotemForm` — separado de `totem-form.ts` só para manter os arquivos abaixo de ~300
 * linhas (regra da Fase 4); é a mesma porta literal de `TotemFormDialog#validate()` do legado.
 */
export interface TotemFormValidationContext {
  isEditing: boolean;
  existingNames: string[];
  licenseIsDemo: boolean;
  /** `licensePoolMode` já resolvido no diálogo (pool geral && !licença paga em edição local). */
  licensePoolMode: boolean;
  selectedLicenseId: string | null;
}

/** Porta literal de `TotemFormDialog#validate()`. Retorna o mapa de erros (vazio = válido). */
export function validateTotemForm(
  form: TotemConfigFormData,
  ctx: TotemFormValidationContext,
): Record<string, string> {
  const errs: Record<string, string> = {};
  const { isEditing, existingNames, licenseIsDemo, licensePoolMode, selectedLicenseId } = ctx;

  const mode = form.app_mode;
  if (mode !== "demo" && mode !== "homologacao" && mode !== "producao") {
    errs.app_mode = "Selecione um modo válido";
  } else if (licenseIsDemo && mode === "producao") {
    errs.app_mode =
      "Licença Demo: use Demonstração ou Homologação, ou vincule uma licença Standard/Pro na aba Licença.";
  }

  if (!form.totem_name.trim()) errs.totem_name = "Nome é obrigatório";
  else if (!TOTEM_NAME_REGEX.test(form.totem_name))
    errs.totem_name = "Apenas A-Z, 0-9 e hífen. Ex: TOTEM-LOJA01-CAIXA01";
  else if (!isEditing && existingNames.includes(form.totem_name))
    errs.totem_name = "Já existe um totem com este nome";

  if (licensePoolMode && isEditing && form.is_active && !selectedLicenseId) {
    errs.license = "Vincule uma licença ou desative o totem antes de salvar";
  }

  const urlTrim = form.nfce_service_url != null ? String(form.nfce_service_url).trim() : "";
  if (urlTrim !== "" && !isNfceHttpUrl(urlTrim)) {
    errs.nfce_service_url = "Use http:// ou https:// com host e porta";
  }

  if (form.nfce_emit_timeout_ms != null) {
    const n = Number(form.nfce_emit_timeout_ms);
    if (!Number.isFinite(n) || n < 10000 || n > 300000) {
      errs.nfce_emit_timeout_ms = "Entre 10000 e 300000 ms, ou deixe vazio";
    }
  }

  if (form.nfce_serie != null) {
    const sn = Number(form.nfce_serie);
    if (!Number.isFinite(sn) || sn < 1 || sn > 999) {
      errs.nfce_serie = "Série NFC-e entre 1 e 999";
    }
  }

  const tefUrlTrim = form.tef_http_base_url != null ? String(form.tef_http_base_url).trim() : "";
  if (tefUrlTrim !== "" && !isNfceHttpUrl(tefUrlTrim)) {
    errs.tef_http_base_url = "Use http:// ou https:// com host e porta";
  }

  const pixUrlTrim = form.pix_http_base_url != null ? String(form.pix_http_base_url).trim() : "";
  if (pixUrlTrim !== "" && !isNfceHttpUrl(pixUrlTrim)) {
    errs.pix_http_base_url = "Use http:// ou https:// com host e porta";
  }

  const tefRtUrl = form.tef_base_url != null ? String(form.tef_base_url).trim() : "";
  if (tefRtUrl !== "") {
    const r = isAditumRuntimeUrl(tefRtUrl);
    if (!r.ok) errs.tef_base_url = r.reason ?? "URL inválida (ex.: https://localhost:4090)";
  }

  const cnpj = form.establishment_cnpj != null ? String(form.establishment_cnpj).replace(/\D/g, "") : "";
  if (cnpj !== "") {
    if (cnpj.length !== 14) {
      errs.establishment_cnpj = "CNPJ deve ter 14 dígitos (sem máscara)";
    } else if (isCnpjAllSameDigit(cnpj)) {
      errs.establishment_cnpj = "CNPJ inválido (dígitos repetidos)";
    }
  }

  const appName = form.tef_application_name != null ? String(form.tef_application_name).trim() : "";
  if (appName === "") {
    errs.tef_application_name = "Application Name é obrigatório";
  } else if (appName.length > APP_NAME_MAX) {
    errs.tef_application_name = `Máximo ${APP_NAME_MAX} caracteres`;
  }

  const appVer = form.tef_application_version != null ? String(form.tef_application_version).trim() : "";
  if (appVer === "") {
    errs.tef_application_version = "Application Version é obrigatório";
  } else if (!APP_VERSION_REGEX.test(appVer)) {
    errs.tef_application_version = "Formato esperado: x.y.z (ex.: 1.0.0)";
  }

  const claim = form.tef_claim_source_statuses != null ? String(form.tef_claim_source_statuses).trim() : "";
  if (claim !== "") {
    const tokens = claim.split(",").map((t) => t.trim());
    if (tokens.some((t) => !CLAIM_STATUS_TOKEN_REGEX.test(t))) {
      errs.tef_claim_source_statuses = "CSV de status em minúsculas, ex.: pending,tef_requested";
    }
  }

  if (form.tef_poll_interval_ms != null) {
    const n = Number(form.tef_poll_interval_ms);
    if (!Number.isFinite(n) || n < 100 || n > 60000) {
      errs.tef_poll_interval_ms = "Entre 100 e 60000 ms";
    }
  }

  if (form.tef_poll_max_ms != null) {
    const n = Number(form.tef_poll_max_ms);
    if (!Number.isFinite(n) || n < 1000 || n > 600000) {
      errs.tef_poll_max_ms = "Entre 1000 e 600000 ms";
    }
  }

  if (
    form.tef_poll_interval_ms != null &&
    form.tef_poll_max_ms != null &&
    Number(form.tef_poll_max_ms) <= Number(form.tef_poll_interval_ms)
  ) {
    errs.tef_poll_max_ms = "Poll max deve ser maior que poll interval";
  }

  const imgHost = form.image_server_host != null ? String(form.image_server_host).trim() : "";
  if (imgHost.length > 253) errs.image_server_host = "Host muito longo";

  if (form.image_server_port != null) {
    const pn = Number(form.image_server_port);
    if (!Number.isFinite(pn) || pn < 1 || pn > 65535) {
      errs.image_server_port = "Porta entre 1 e 65535";
    }
  }

  return errs;
}
