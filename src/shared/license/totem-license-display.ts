/**
 * Porta de `LEGACY/src/lib/totem-license-display.ts`.
 *
 * Divergência deliberada: o legado tipa os parâmetros como `Pick<TotemConfig, ...>`, importado de
 * `@/types/totem.types`. Este módulo vive em `src/shared/license` e é consumido pelo módulo
 * `src/modules/totems` (Onda 1) — não o contrário —, então ele não pode depender de um tipo de
 * módulo sem inverter a direção de dependência (mesma regra que já vale para `shared/plan`,
 * `shared/format` etc.). `TotemLicenseFields` abaixo é a mesma forma estrutural que o legado usa
 * via `Pick<>`, só que declarada localmente.
 */
export interface TotemLicenseFields {
  is_active?: boolean | null;
  license_id?: string | null;
  license_status?: string | null;
}

/** Licença vinculada e ativa em `totem_licenses` / `device_licenses`. */
export function hasActiveTotemLicense(
  totem: Pick<TotemLicenseFields, "license_id" | "license_status">,
): boolean {
  if (!totem.license_id?.trim()) return false;
  return totem.license_status?.trim().toLowerCase() === "active";
}

/** Totem só pode operar como ativo com licença ativa (ignora `is_active` órfão no PG). */
export function effectiveTotemIsActive(
  totem: Pick<TotemLicenseFields, "is_active" | "license_id" | "license_status">,
): boolean {
  return Boolean(totem.is_active) && hasActiveTotemLicense(totem);
}

/** @deprecated Use hasActiveTotemLicense */
export function hasTotemLicenseInLocalPg(
  totem: Pick<TotemLicenseFields, "license_id" | "license_status">,
): boolean {
  return hasActiveTotemLicense(totem);
}
