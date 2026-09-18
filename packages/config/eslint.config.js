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
//
// no-restricted-imports' "apps/**" group is the "shared packages/apps must
// not import from apps" boundary from FAS_ERP_Architecture_Guide.md §3/§4:
// nothing outside an app should ever reach into another app's folder by
// relative or aliased path — apps consume packages, never each other, and
// packages never reach back into an app. This is ESLint core (no plugin),
// so it applies uniformly wherever `enforcement` is spread in (apps/api,
// apps/ui, every packages/* config).
/** @type {import("eslint").Linter.Config} */
const enforcement = {
  plugins: { sonarjs },
  rules: {
    "sonarjs/no-identical-functions": "error",
    "no-duplicate-imports": "error",
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["**/apps/*/**", "apps/*/**"],
            message:
              "Don't import across apps/* boundaries — share code via packages/* instead (see FAS_ERP_Architecture_Guide.md).",
          },
        ],
      },
    ],
    // A leading underscore is the repo-wide convention for "intentionally
    // unused" (a required parameter a stub/interface implementation doesn't
    // use yet, or a destructured value you're deliberately discarding) —
    // typescript-eslint's `recommended` doesn't set this by default, so
    // every generated/stub file would otherwise need a per-line disable.
    "@typescript-eslint/no-unused-vars": [
      "error",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};

// This config file (and any other flat config file, e.g. a consumer's own
// eslint.config.js/cjs) is itself CommonJS, loaded by Node directly rather
// than bundled — `require`/`module`/etc. are real globals there, but nothing
// above declares that, so the recommended JS/TS rules below (no-undef,
// @typescript-eslint/no-require-imports) flag this file's own top and bottom.
// Deliberately not converting to ESM import/export here — other packages
// require() this file directly, and switching module systems risks breaking
// that. Scoped to config files only so it doesn't loosen these rules for
// application code.
/** @type {import("eslint").Linter.Config} */
const configFilesOverride = {
  files: ["**/eslint.config.js", "**/*.config.js", "**/*.config.cjs"],
  languageOptions: {
    globals: {
      require: "readonly",
      module: "readonly",
      exports: "writable",
      __dirname: "readonly",
      __filename: "readonly",
      process: "readonly",
    },
  },
  rules: {
    "@typescript-eslint/no-require-imports": "off",
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
  configFilesOverride,
  eslintConfigPrettier,
];

module.exports = recommended;
module.exports.ignores = ignores;
module.exports.prettier = eslintConfigPrettier;
module.exports.enforcement = enforcement;
module.exports.recommended = recommended;
