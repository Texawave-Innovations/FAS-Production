# FAS ERP — root agent/contributor entry point

> **Owner:** Tech Lead role (Software Architect on the Architecture Guide's byline) — no named
> individual assigned yet; update this line when one is.
> **Status:** Foundation phase (base code, structure, shared components, dev rules, enforcement).
> No business modules exist yet — `platform/auth` + the login flow are the only end-to-end feature.
> **Last verified:** 2026-09-18 — verified by reading the actual source referenced below (not by
> trusting doc claims) and by running the commands in "Validate your work" against a clean checkout.
> Re-verify and update this line whenever you materially change what's described here.

## Canonical docs — read before editing

| Doc                                                                      | Covers                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| [docs/FAS_ERP_Architecture_Guide.md](docs/FAS_ERP_Architecture_Guide.md) | System/package ownership, dependency direction, data model, multi-tenancy/RBAC, module boundaries |
| [docs/FAS_ERP_CODING_STANDARDS.md](docs/FAS_ERP_CODING_STANDARDS.md)     | Concrete backend/frontend patterns, naming, DTOs/entities, error handling, testing, PR checklist  |
| [docs/FAS_ERP_DESIGN_SYSTEM.md](docs/FAS_ERP_DESIGN_SYSTEM.md)           | Design tokens (`packages/ui-kit/src/theme.css`), component contracts, responsive/dark-mode rules  |

These three are the single source of truth for "how do I build this." If you find them contradicting
each other or the actual code, **say so and ask/flag it — don't silently pick one and move on.** Fix
the doc in the same PR if the fix is small and unambiguous; otherwise flag it explicitly in the PR
description.

Per-app agent notes that layer on top of this file (read them too, for that app):
[apps/ui/CLAUDE.md](apps/ui/CLAUDE.md) (→ `apps/ui/AGENTS.md`), [apps/mobile/CLAUDE.md](apps/mobile/CLAUDE.md).

## Before writing any code

1. **Inspect existing patterns first.** Find the closest existing module/feature/component and match
   its shape. `platform/auth` (backend) + `features/auth` (frontend) is the current reference — see
   "Reference implementation" below.
2. **Reuse before creating**, in this order (Coding Standards §6): `packages/core` → `apps/api/src/shared`
   (backend infra) → `packages/ui-kit` (frontend primitives) → the generic platform tables
   (`statuses`, `attachments`, `approvals`, `audit_logs`, `status_history` via `entity_type`/`entity_id`)
   → only then write new code, in the most specific location the layout calls for.
3. **Stay inside the requested scope.** Don't refactor, upgrade dependencies, or "clean up" adjacent
   code that wasn't asked for. Don't expand a bug fix into a redesign.
4. **Preserve unrelated and uncommitted work.** Run `git status` before anything that touches the
   working tree beyond your own edits; never `reset --hard`/`checkout --`/`clean -f` over work you
   didn't create without checking first.

## Folder/dependency boundaries (enforced where noted — see Architecture Guide for the full rule)

- `apps/api/src/modules/*` — business capabilities. `apps/api/src/platform/*` — auth/tenancy/platform.
  `apps/api/src/common/*` — request-pipeline framework primitives (filters/interceptors/decorators/DTOs).
  `apps/api/src/shared/*` — injectable infra used by 2+ modules (Prisma, Redis). See Coding Standards §3.
- `apps/ui/src/app/*` — routing/layout only, thin page composition. `apps/ui/src/features/*` — real
  feature code (components/hooks/api/schema). `packages/ui-kit` — dumb shared primitives, no API calls,
  no domain knowledge.
- `packages/core` — framework-agnostic shared logic. `packages/api-types` — API↔UI wire types (hand-written
  today, generation target — Coding Standards §11). `packages/database` — Prisma schema/migrations, owned
  by `apps/api`. `packages/config` — shared tsconfig/eslint/prettier.
- Controllers never call Prisma. Services never import `PrismaService` directly (repository-only).
  Feature modules never import another module's repository/service directly for a side effect
  (`EventEmitter2`, Coding Standards §17) — a narrow, named public-service exception exists for
  genuine synchronous coordination; see that section before reaching for a direct import.
  Frontend never imports `@fas-erp/database` or any Prisma type.
- Lint enforces the mechanical parts of this (see "Enforcement" below); the module-boundary and
  event-vs-direct-call judgment calls are **review-only** — a passing lint run does not mean the
  architecture is right, a human still checks it.

## Changes that need lead review before merge

New dependencies · changes to shared package boundaries or `packages/config`/`packages/core`/
`packages/database`/`packages/ui-kit` · auth/tenancy changes (`platform/auth`, `platform/tenancy`,
anything touching `getOrgScope()`/`buildScopedWhere()`) · shared UI-kit component or design-token contract changes ·
anything that weakens/removes a lint rule, type check, test, or CI gate · database migrations.

This is a review-before-merge list, not a stop-and-ask-permission-before-starting list — implement
these as part of ordinary work and flag them clearly in the PR description; you don't need to pause
and request permission mid-task for routine instances of the above. Pause and ask first only for a
genuinely blocking product/security/architecture decision that the repo/docs don't resolve (example
already on file: login has no org selector and `User` is unique per `(organizationId, email)` — see
Architecture Guide §7 point 6 — resolving that is a product decision, not something to patch silently).

## Validate your work

From repo root:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run lint typecheck test build
```

Frontend browser/responsive checks (separate — needs a browser binary, not in the default pipeline):

```sh
pnpm --filter ui exec playwright install chromium   # one-time
pnpm --filter ui test:e2e
```

- **Never weaken a lint rule, type-check setting, or test to make a check pass.** Fix the underlying
  issue, or explicitly flag in the PR why the rule doesn't fit (see "Enforcement" below) and get it
  reviewed — don't `eslint-disable`/`@ts-ignore`/skip a test as a routine fix.
- **Never report a check as passing without having actually run it in this session.** If a check
  can't run (missing service/credential/binary), say exactly which one, why, and what you verified
  instead.
- Check that the workspace you touched actually ran in the pipeline — `turbo run <task>` silently
  skips any package missing that script. (`apps/ui` has no unit-test script by design — Playwright
  e2e is separate, see Coding Standards §20; `apps/mobile` currently only has `lint`/`typecheck`,
  no `test`/`build` — there's no app code yet to test or build.)

## Enforcement — automatic vs. review-only

Automatic (CI-enforced via `turbo run lint typecheck test build`, see `.github/workflows/ci.yml`):

- TypeScript strict mode + `noUncheckedIndexedAccess` (`packages/config/tsconfig.base.json`).
- ESLint recommended + `sonarjs/no-identical-functions` + `no-duplicate-imports` +
  `no-restricted-imports` for the "apps/\* is not importable from packages/\*" boundary
  (`packages/config/eslint.config.js`'s `enforcement`, spread into every workspace's own config).
- Frontend can't import `@fas-erp/database`/`@prisma/client` (`apps/ui/eslint.config.mjs`,
  `apps/mobile/eslint.config.mjs`).
- Backend controllers/services can't import Prisma directly, and a module/platform folder's
  `*.repository.ts` can't be imported from a _different_ module/platform folder — `eslint-plugin-boundaries`
  (`apps/api/eslint.config.mjs`; see that file's comments for exactly what's exempted — `shared/`,
  `platform/health`, and a module importing its own repository — and why).
- `@typescript-eslint/no-floating-promises` + `no-misused-promises` (type-checked, `apps/api` only —
  scoped there deliberately, see that file's comment).
- React hook rules (`react-hooks/*` via `eslint-config-next`, `apps/ui`).
- Prettier formatting; Vitest unit tests (`apps/api`); Next.js/TS build.
- `pnpm check:circular` (madge) — not wired into the default `lint`/CI task yet (see below), run it
  manually before a large refactor; clean as of this writing.

Every one of the rules above was verified with an actual negative test (a deliberately-violating
temp file, linted, confirmed to fail, then deleted) during this pass — not just configured and
assumed to work. See each config file's comments for the specific gotchas that made a first attempt
silently no-op (e.g. the boundaries plugin's default resolver not understanding this repo's
NodeNext-style `.js`-suffixed relative imports).

Review-only (a human must catch these — no lint rule proves them): Controller→Service→Repository
layering _within_ a file (lint catches Prisma imports in the wrong file, not "this service method
has business logic that belongs in a validator"); whether a repository method actually calls
`getOrgScope()`/`buildScopedWhere()` at all (Coding Standards §16 — the merge-order safety is
structural, whether it's called is not); event-vs-direct-import judgment calls beyond the
mechanical repository-import check (Coding Standards §17); whether a new shared abstraction solves a
demonstrated need vs. speculative reuse; whether a `custom_fields` JSON key vs. a real column is the
right call for a new field; accessibility and responsive behavior beyond what Playwright's viewport
checks cover; circular dependencies (`check:circular` is a manual/CI-only script, not a pre-commit or
default-lint gate — deliberately, since madge's project-wide scan is too slow for lint-staged's
pre-commit hook).

## Repository settings (GitHub — outside what a config file can enforce)

These need enabling in the GitHub repo's own settings (Settings → Branches → branch protection rule
for `main`) — a CODEOWNERS file or a green CI check means nothing on its own if the branch itself
still accepts a direct/unreviewed push:

- **Require a pull request before merging**, with **required approvals ≥ 1**.
- **Require review from Code Owners** — otherwise `.github/CODEOWNERS` is just documentation.
- **Require status checks to pass before merging**, selecting both CI jobs by name:
  `lint-typecheck-test-build` and `ui-browser-smoke` (`.github/workflows/ci.yml`).
- **Do not allow bypassing the above settings** (no force-push, no admin bypass) once the team is
  bigger than one person — with a single collaborator today, an admin-bypass allowance is a
  reasonable temporary exception, not a default to leave on indefinitely.

As of this writing, `main` on `github.com/Texawave-Innovations/FAS-Production` has **no branch
protection configured** (checked via `gh api repos/.../branches/main/protection` → 404) and
`.github/CODEOWNERS` is new in this change — enabling the above is a deliberate action against live
repository settings, not a file edit, so it's listed here rather than applied automatically.

## Reference implementation

`platform/auth` (`apps/api/src/platform/auth/`) + `features/auth` (`apps/ui/src/features/auth/`) is
the only real feature today — it demonstrates Controller→Service→Repository, DTOs, JWT+Redis refresh
rotation, `UserEntity`'s `@Exclude()` pattern, the `{ data, meta }` envelope, and the frontend
api-client/auth-context/toast-error pattern end to end. Match its shape for anything new before
inventing a different one. See `FAS_ERP_CODING_STANDARDS.md` §21 for the full list of what it does
and doesn't demonstrate yet.

**Starting a new module?** `node tools/generate-module.mjs <name> [--domain <domain>]` scaffolds the
Controller/Service/Repository/DTO skeleton and a matching frontend feature folder from this same
reference pattern — see `FAS_ERP_CODING_STANDARDS.md` §22. It deliberately doesn't invent a Prisma
model, permission string, or business rule; you still design and wire those.

## When you finish a task

Report: which files changed, which validation commands you ran and their actual output, and any
remaining limitation or blocker — don't claim something works if you didn't run it.
