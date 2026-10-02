import { isDemoLicense } from "@/shared/license/license-labels";
import { hasActiveTotemLicense } from "@/shared/license/totem-license-display";
import type { TotemConfig, TotemLicenseSlot } from "./totem-config";

/**
 * Regras de licença/pool de `LEGACY/src/pages/TotemConfigPage.tsx` e
 * `LEGACY/src/components/totem/TotemFormDialog.tsx`, adaptadas aos dois backends do Next.
 *
 * O legado tem 4 modos (Electron, Admin API/LAN, Cloud Supabase legado, Cloud EasyFoodAPI) e
 * calcula `cloudMode = isCloudSupabaseMode()` / `localPgMode = isLocalPgTotemMode()` (Electron OU
 * Admin API, nunca Supabase). O Next só tem dois backends, mutuamente exclusivos — `lan`
 * (equivalente a "Admin API local", já que não há Electron) e `cloud` (EasyFoodAPI) — então:
 *
 * - `cloudMode` (legado) → `backend === "cloud"`
 * - `localPgMode`/`localDemoOnly` (legado) → `backend === "lan"`
 * - `licensePoolMode = cloudMode || localPgMode` (legado) → SEMPRE `true` no Next, porque os dois
 *   backends cobrem o "ou": não existe um terceiro modo (mock de navegador) em que a tela precise
 *   desabilitar o pool de licenças. Mantido como campo explícito (não um literal `true` espalhado)
 *   para documentar essa equivalência e não quebrar se um 3º backend for adicionado no futuro.
 */
export interface TotemLicensePolicy {
  /** Backend `cloud` (EasyFoodAPI) — nuvem administra qualquer licença, paga ou Demo. */
  cloudMode: boolean;
  /** Backend `lan` — só a licença Demo é administrável aqui; a paga é só-leitura (portal manda). */
  localPgOnly: boolean;
  /** Sempre `true` no Next (ver comentário acima) — mantido por paridade de nome com o legado. */
  licensePoolMode: boolean;
}

export function resolveTotemLicensePolicy(backend: "lan" | "cloud"): TotemLicensePolicy {
  const cloudMode = backend === "cloud";
  const localPgOnly = backend === "lan";
  return { cloudMode, localPgOnly, licensePoolMode: true };
}

/** Totem em edição já usa licença paga: localmente (LAN) ela é somente leitura. */
export function isEditingPaidLicense(totem: Pick<TotemConfig, "license_id" | "license_status" | "license_type" | "plan_slug"> | null): boolean {
  if (!totem) return false;
  return hasActiveTotemLicense(totem) && !isDemoLicense(totem.license_type, totem.plan_slug);
}

/** No LAN só a Demo é vinculável aqui; a paga continua exclusiva do portal (nuvem). */
export function filterSelectableLicensesForPage(
  all: TotemLicenseSlot[],
  localPgOnly: boolean,
): TotemLicenseSlot[] {
  return localPgOnly ? all.filter((l) => isDemoLicense(l.license_type, l.plan_slug)) : all;
}

/** Slots livres (não vinculados a nenhum totem). */
export function filterFreeLicenses(licenses: TotemLicenseSlot[]): TotemLicenseSlot[] {
  return licenses.filter((l) => l.totem_config_id == null);
}

/**
 * A licença atualmente vinculada a um totem em edição: a linha correspondente em
 * `availableLicenses`, ou — se a lista ainda não carregou/não a inclui — um objeto sintético
 * derivado dos campos achatados do próprio totem (mesmo fallback do legado, linha 195-208 de
 * `TotemFormDialog.tsx`: usa `totem.totem_name` como `device_key`, nunca `license_device_key`).
 */
export function resolveCurrentLicense(
  totem: TotemConfig | null,
  availableLicenses: TotemLicenseSlot[],
): TotemLicenseSlot | null {
  if (!totem) return null;
  const loaded = availableLicenses.find((l) => l.totem_config_id === totem.id);
  if (loaded) return loaded;
  if (!totem.license_id) return null;
  return {
    id: totem.license_id,
    device_key: totem.totem_name,
    license_type: totem.license_type ?? "",
    plan_slug: totem.plan_slug ?? null,
    status: totem.license_status ?? "active",
    totem_config_id: totem.id,
  };
}

/** Licenças selecionáveis no diálogo: livres, mais a que já é deste totem (edição). */
export function filterDialogSelectableLicenses(
  availableLicenses: TotemLicenseSlot[],
  licensePoolMode: boolean,
  totemId: string | null,
): TotemLicenseSlot[] {
  if (!licensePoolMode) return [];
  return availableLicenses.filter((l) => l.totem_config_id == null || (totemId != null && l.totem_config_id === totemId));
}

/** `true` quando a licença efetiva (selecionada no diálogo, ou já vinculada) é Demo. */
export function computeLicenseIsDemo(
  effectiveLicense: TotemLicenseSlot | null,
  totem: Pick<TotemConfig, "license_type" | "plan_slug"> | null,
): boolean {
  if (effectiveLicense) return isDemoLicense(effectiveLicense.license_type, effectiveLicense.plan_slug);
  if (totem?.license_type != null || totem?.plan_slug != null) {
    return isDemoLicense(totem?.license_type, totem?.plan_slug);
  }
  return false;
}

/** `true` quando já existe alguma licença (selecionada ou vinculada) para classificar. */
export function hasSomeLicense(
  effectiveLicense: TotemLicenseSlot | null,
  totem: Pick<TotemConfig, "license_id"> | null,
): boolean {
  return effectiveLicense != null || (totem?.license_id != null && String(totem.license_id).trim() !== "");
}
