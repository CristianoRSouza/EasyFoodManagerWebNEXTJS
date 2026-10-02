/**
 * Menor 6 da revisão da Fase 3: `formatCnpj`/`taxRegimeLabel`/`envLabel` aqui têm as mesmas
 * responsabilidades que `formatCnpj`/`crtLabel`/`ambienteLabel` em
 * `src/modules/nfce/domain/nfce-formatters.ts` — mas os textos DIVERGEM de propósito (copiam
 * dois legados diferentes: "Excesso de sublimite" nesse arquivo × "Excesso Receita" aqui) e as
 * assinaturas também (`string` não-nulo aqui vs. `string | null` lá). Paridade visual exige as
 * duas versões — não "unifique" sem antes confirmar com o usuário qual legado cada tela deve
 * seguir.
 */
export const formatCnpj = (v: string) =>
  v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

export const formatCep = (v: string) =>
  v.replace(/^(\d{5})(\d{3})$/, "$1-$2");

// Regime ausente devolve null (a linha mostra "—"). Nada de supor Regime Normal: a nuvem
// fazia isso e um emitente do Simples aparecia como Regime Normal (legado 1.3.12, PR #35).
export const taxRegimeLabel = (c: number | null | undefined): string | null =>
  c == null
    ? null
    : ({
        1: "Simples Nacional",
        2: "Simples Nacional – Excesso Receita",
        3: "Regime Normal",
        4: "MEI",
      }[c] ?? String(c));

export const envLabel = (e: number) => (e === 1 ? "Produção" : "Homologação");
