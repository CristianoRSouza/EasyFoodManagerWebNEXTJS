import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "tests/visual/output/**", "next-env.d.ts"]),
  {
    files: ["src/shared/**", "src/modules/**", "src/app/**/*.tsx"],
    ignores: ["src/app/**/page.tsx", "src/app/**/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: ["@/server/*"] }],
    },
  },
  {
    files: ["src/modules/*/domain/**", "src/modules/*/application/**"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: ["react", "react-dom", "next", "next/*", "@/server/*", "@/shared/http/*", "../infrastructure/*", "../ui/*"],
      }],
    },
  },
  {
    // Copiados verbatim do repo legado (shadcn); não são código nosso para "corrigir" a fórmula.
    files: ["src/shared/ui/primitives/**", "src/shared/ui/use-toast.ts"],
    rules: {
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-empty-object-type": "off",
    },
  },
  {
    // LazyFiscalCard: cópia fiel de LEGACY/src/components/nfce-issuer/LazyFiscalCard.tsx.
    // O fetch disparado em `useEffect` (eager e IntersectionObserver) é a fila
    // sequencial/paralela do legado; preservado tal qual (ver comentário no arquivo).
    files: ["src/shared/ui/issuer-sections/LazyFiscalCard.tsx"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
