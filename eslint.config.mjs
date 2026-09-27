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
]);
