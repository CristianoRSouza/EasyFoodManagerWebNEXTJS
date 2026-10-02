/**
 * Valor fiscal numérico formatado com casas fixas — legado 1.3.12 (`Products.tsx#fmtFiscalNum`,
 * PR #31).
 *
 * Zero é valor, não ausência: a API da loja entrega `numeric` como número e a nuvem como texto
 * (`"0.00"`). Com `valor ? … : null`, o `0` da loja virava "—" e o `"0.00"` da nuvem aparecia — a
 * mesma alíquota zerada mostrada de dois jeitos.
 */
export function fmtFiscalNum(v: string | number | null | undefined, digits: number, suffix = ""): string | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return `${n.toFixed(digits)}${suffix}`;
}
