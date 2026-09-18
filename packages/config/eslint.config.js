// @ts-check
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");
const sonarjs = require("eslint-plugin-sonarjs");

/** @type {import("eslint").Linter.Config} */
const ignores = {
  ignores: [
    "**/dist/**",
    "**/build/**",
    "**/.next/**",
    "**/.turbo/**",
    "**/node_modules/**",
    "**/coverage/**",
  ],
};

// Mandatory enforcement rules per CODING_STANDARDS.md §6 ("Reuse, don't
// recreate"): sonarjs/no-identical-functions flags copy-pasted logic that
// should have been pulled into packages/core or apps/api/src/shared instead,
// no-duplicate-imports (ESLint core — no plugin needed; eslint-plugin-import's
// flat-config release doesn't actually expose a rule under this name despite
// the "import/" prefix CODING_STANDARDS.md historically used) catches the
// same module imported twice across separate statements. Registered as
// individual rules rather than pulling in sonarjs's full recommended config,
// to avoid unrelated churn against existing files.
/** @type {import("eslint").Linter.Config} */
const enforcement = {
  plugins: { sonarjs },
  rules: {
    "sonarjs/no-identical-functions": "error",
    "no-duplicate-imports": "error",
  },
};

/**
 * Full base config: shared ignores + recommended JS/TS rules + Prettier
 * compat. Use this as-is in apps/packages that don't bring their own
 * typescript-eslint setup (apps/api, packages/core, packages/api-types,
 * packages/ui-kit).
 *
 * Frameworks that ship their own typescript-eslint-based config (e.g.
 * eslint-config-next) register their own "@typescript-eslint" plugin
 * instance, which flat-config refuses to merge with this one — those
 * consumers should import the named `ignores`/`prettier` pieces instead
 * of the default export. See apps/ui/eslint.config.mjs.
 *
 * @type {import("eslint").Linter.Config[]}
 */
const recommended = [
  ignores,
  js.configs.recommended,
  ...tseslint.configs.recommended,
  enforcement,
  eslintConfigPrettier,
];

module.exports = recommended;
module.exports.ignores = ignores;
module.exports.prettier = eslintConfigPrettier;
module.exports.enforcement = enforcement;
module.exports.recommended = recommended;
