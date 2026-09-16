import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import baseConfig from "@fas-erp/config/eslint.config.js";

// Note: we can't spread @fas-erp/config's full default export here —
// eslint-config-next/typescript brings its own typescript-eslint plugin
// instance, and flat config refuses to merge two different instances
// registered under the same "@typescript-eslint" key. So we take only the
// non-conflicting shared pieces (ignores, Prettier compat) and let Next
// supply its own TS linting.
const eslintConfig = defineConfig([
  baseConfig.ignores,
  ...nextVitals,
  ...nextTs,
  // Re-applied last: Next's configs can re-enable stylistic rules that
  // conflict with Prettier, which is the formatter of record (packages/config).
  baseConfig.prettier,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
