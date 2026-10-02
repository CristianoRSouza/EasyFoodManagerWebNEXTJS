/** `1.2.5` → `1.2.05`: o formato que o painel sempre exibiu. */
export function formatVersionLabel(version: string): string {
  return version.replace(
    /^(\d+)\.(\d+)\.(\d+)$/,
    (_match, major: string, minor: string, patch: string) =>
      `${major}.${minor}.${String(Number(patch)).padStart(2, "0")}`,
  );
}

/** `NEXT_PUBLIC_APP_VERSION` vem do `package.json`, pelo `next.config.ts` (e pelo `vitest.config.ts` nos testes). */
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";

/** A versão como o painel a exibe. */
export const APP_VERSION_LABEL = formatVersionLabel(APP_VERSION);
