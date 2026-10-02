/**
 * Rótulos amigáveis de licença (Demo 1, Standard 2, …) — alinhado entre Admin e Totem local.
 *
 * Porta fiel de `LEGACY/src/lib/license-labels.ts` — nenhuma regra mudou.
 */

export const PLAN_SLUG_LABELS: Record<string, string> = {
  "ecp-demo": "Demo",
  "ecp-standard": "Standard",
  "ecp-pro": "Pro",
  "ecp-enterprise": "Enterprise",
};

export const LICENSE_TYPE_LABELS: Record<string, string> = {
  monthly: "Mensal",
  annual: "Anual",
  yearly: "Anual",
  trial: "Trial",
  demo: "Demo",
  perpetual: "Perpétua",
};

export interface LicenseLabelRecord {
  id: string;
  /** Slot do plano (TOTEM-061…) — desempate estável quando created_at coincide. */
  device_key?: string | null;
  license_type?: string | null;
  plan_slug?: string | null;
  created_at: string;
}

function deviceKeySortNum(deviceKey?: string | null): number {
  const m = String(deviceKey ?? "").match(/(\d+)\s*$/);
  return m?.[1] ? Number.parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
}

/** Ordem estável para rótulos Demo 1 / Standard 2 — alinhada ao device_key da nuvem. */
export function compareLicensesForLabelOrder(
  a: LicenseLabelRecord,
  b: LicenseLabelRecord,
): number {
  const byDate = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  if (byDate !== 0) return byDate;
  const byKey = deviceKeySortNum(a.device_key) - deviceKeySortNum(b.device_key);
  if (byKey !== 0) return byKey;
  return a.id.localeCompare(b.id);
}

export function getLicensePlanLabel(
  licenseType?: string | null,
  planSlug?: string | null,
): string {
  const slug = planSlug?.trim();
  if (slug) {
    return PLAN_SLUG_LABELS[slug] ?? formatSlugFallback(slug);
  }

  const lt = (licenseType ?? "").trim().toLowerCase();
  if (!lt || lt === "monthly" || lt === "trial") {
    return "Demo";
  }

  return LICENSE_TYPE_LABELS[lt] ?? (licenseType?.trim() || "Demo");
}

export function isDemoLicense(
  licenseType?: string | null,
  planSlug?: string | null,
): boolean {
  const slug = planSlug?.trim();
  if (slug === "ecp-demo") return true;
  if (slug) return false;

  const lt = (licenseType ?? "").trim().toLowerCase();
  return !lt || lt === "monthly" || lt === "trial" || lt === "demo";
}

/**
 * Numera licenças por grupo de label (1..N por created_at).
 * Não re-sequencia após remoções — só numera IDs presentes na lista.
 */
export function buildLicenseLabelMap(licenses: LicenseLabelRecord[]): Map<string, string> {
  const groups = new Map<string, LicenseLabelRecord[]>();

  for (const lic of licenses) {
    const label = getLicensePlanLabel(lic.license_type, lic.plan_slug);
    const bucket = groups.get(label) ?? [];
    bucket.push(lic);
    groups.set(label, bucket);
  }

  const result = new Map<string, string>();

  for (const [label, items] of groups) {
    const sorted = [...items].sort(compareLicensesForLabelOrder);
    sorted.forEach((lic, index) => {
      result.set(lic.id, `${label} ${index + 1}`);
    });
  }

  return result;
}

function formatSlugFallback(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
