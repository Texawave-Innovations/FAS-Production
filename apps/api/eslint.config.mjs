import boundaries from "eslint-plugin-boundaries";
import baseConfig from "@fas-erp/config/eslint.config.js";

export default [
  ...baseConfig,
  {
    rules: {
      // Nest decorators commonly take an empty class body (e.g. `export class AppModule {}`).
      "@typescript-eslint/no-extraneous-class": "off",
    },
  },
  {
    // Type-checked linting, scoped to just the floating/misused-promise
    // rules (Phase 5's "unhandled/floating promises" requirement) rather
    // than the full recommendedTypeChecked set — that set adds several
    // no-unsafe-* rules that would surface a large amount of unrelated
    // churn against existing files; add those individually, later, only if
    // a real bug motivates it (same "don't pull in more than needed"
    // philosophy as packages/config/eslint.config.js's own `enforcement`
    // block). NestJS request handlers/services are exactly where a
    // fire-and-forget `async` call silently swallowing a rejection is worth
    // catching — this is the one place in the repo it earns the extra
    // type-check cost.
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  },
  {
    // Controllers/services must not talk to Prisma directly — repositories
    // are the only Prisma consumer (FAS_ERP_CODING_STANDARDS.md §3/§5's DIP).
    // This is a static import-path check, not element-boundary-aware, so
    // plain no-restricted-imports (no plugin) is the right tool — unlike the
    // module-to-module repository isolation below, this doesn't need to
    // compare *which* module the importer/importee belong to.
    files: ["src/**/*.controller.ts", "src/**/*.service.ts"],
    ignores: [
      "src/**/*.spec.ts",
      // apps/api/src/shared/* is infra providers, not the Controller/Service/
      // Repository business layers this rule targets — shared/prisma/
      // prisma.service.ts is the framework's own PrismaClient wrapper and is
      // *the* legitimate place Prisma gets imported.
      "src/shared/**",
      // platform/health's controller injecting PrismaService/RedisService
      // directly for a liveness ping is the documented Terminus pattern
      // (see that file's own comment), not a business read/write — carved
      // out the same way @RawResponse() carves it out of the response
      // envelope.
      "src/platform/health/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@fas-erp/database",
              message: "Controllers/services must not import Prisma directly — inject the module's *.repository.ts instead.",
            },
          ],
          patterns: [
            {
              group: ["**/shared/prisma/*"],
              message: "Controllers/services must not import PrismaService directly — inject the module's *.repository.ts instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Cross-module boundary: a module/platform folder's own *.repository.ts
    // is private to it (FAS_ERP_Architecture_Guide.md's module-boundary
    // rule) — other modules get data through a service, never by importing
    // the repository directly. `checkInternals` defaults to false, so a
    // module importing its *own* repository (the normal case) is untouched;
    // only a *different* module/platform folder reaching into it is flagged.
    files: ["src/**/*.ts"],
    ignores: ["src/**/*.spec.ts"],
    plugins: { boundaries },
    settings: {
      "boundaries/root-path": "src",
      "boundaries/elements": [
        { type: "module", pattern: "modules/*/**" },
        { type: "platform", pattern: "platform/**" },
      ],
      // Source uses NodeNext-style relative imports with explicit .js
      // specifiers resolving to the sibling .ts file (see e.g.
      // auth.repository.ts's own imports) — boundaries' bundled default
      // resolver (eslint-import-resolver-node) doesn't know that convention
      // and would silently fail to resolve every such import (verified via
      // ESLINT_PLUGIN_BOUNDARIES_DEBUG=1: without this, "to" resolves as
      // isUnknown/path:null for every relative import, so the dependency
      // rule below would never actually fire on this codebase's real import
      // style) — eslint-import-resolver-typescript understands it.
      "import/resolver": {
        typescript: { project: "./tsconfig.json" },
      },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "allow",
          policies: [
            {
              disallow: {
                to: {
                  element: { types: { anyOf: ["module", "platform"] } },
                  fileInternalPath: "*.repository.ts",
                },
              },
            },
          ],
        },
      ],
    },
  },
];
