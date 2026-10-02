import type { Ambiente } from "@/shared/runtime/ambiente";

/**
 * Faixa fixa "HOMOLOGAÇÃO" — cópia de `AmbienteBanner.tsx` do legado 1.3.12 (PRs #48/#50). Só
 * aparece quando o servidor diz `EASYFOOD_AMBIENTE=homolog`.
 *
 * Produção e homologação têm a mesma cara e, lado a lado em duas abas, é fácil cadastrar ou apagar
 * algo no ambiente errado. A faixa e o prefixo no título da aba (`titleForAmbiente`, no
 * `generateMetadata` do layout raiz) existem para esse erro nunca parecer normal. Em produção este
 * componente não renderiza nada.
 */
export function AmbienteBanner({ ambiente }: { ambiente: Ambiente | undefined }) {
  if (ambiente !== "homolog") return null;
  return (
    <div
      role="status"
      data-testid="ambiente-banner"
      className="sticky top-0 z-[100] w-full bg-amber-500 px-3 py-1 text-center text-xs font-bold uppercase tracking-wide text-black"
    >
      Homologação — ambiente de testes (banco de homologação).
    </div>
  );
}
