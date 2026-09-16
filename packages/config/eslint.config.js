// @ts-check
const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const eslintConfigPrettier = require("eslint-config-prettier");

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
const recommended = [ignores, js.configs.recommended, ...tseslint.configs.recommended, eslintConfigPrettier];

module.exports = recommended;
module.exports.ignores = ignores;
module.exports.prettier = eslintConfigPrettier;
module.exports.recommended = recommended;
