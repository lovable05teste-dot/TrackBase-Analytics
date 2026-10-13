import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // App nativo (Expo) tem lint/typecheck próprios.
    "mobile/**",
  ]),
  {
    files: ["app/**/page.tsx"],
    rules: {
      // Páginas são server components com dynamic = "force-dynamic": ler o
      // relógio no render é intencional (cada request recalcula a janela).
      "react-hooks/purity": "off",
    },
  },
  {
    rules: {
      // Busca em useEffect com setLoading(true) é o padrão do app (sem React
      // Compiler); fica como aviso para não esconder erros de verdade.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["components/ui/**/*.{ts,tsx}", "hooks/use-mobile.ts"],
    rules: {
      // These files are vendored verbatim from shadcn@4.17.0. Keep the
      // registry source intact while applying the stricter rules to Site code.
      "@typescript-eslint/no-unused-vars": "off",
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
