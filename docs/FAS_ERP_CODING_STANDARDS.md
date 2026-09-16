# FAS ERP — Coding Standards & Folder Structure Reference
**For every contributor.** If you're adding a file and you're not sure where it goes, this doc answers that before you ask in Slack. Companion doc: `FAS_ERP_Architecture_Guide.md` (system design, data model, module boundaries) — this doc is about *how we write code inside that architecture*.

---

## 1. Repo layout (as scaffolded — Phase 0)

```
fas-erp/
├── apps/
│   ├── api/            # NestJS backend — Vitest for tests
│   │   └── deployment/fas-erp/{dev,uat,prod}/template.yaml
│   ├── ui/              # Next.js 16 (App Router, React 19), Tailwind 4
│   │   └── deployment/fas-erp/{dev,uat,prod}/template.yaml
│   └── mobile/          # Expo 57 / React Native 0.86
├── packages/
│   ├── config/          # tsconfig.base.json, eslint.config.js, prettier.config.js — everything else extends this
│   ├── core/             # framework-agnostic business logic, API client, zod schemas — shared by ui + mobile
│   ├── api-types/        # OpenAPI-generated TS types/DTOs — generated, never hand-written
│   ├── ui-kit/            # shared design-system primitives (web)
│   └── database/          # Prisma schema, migrations, seed — the single source of truth for the data model
├── deployment/            # CI plumbing only (CodeBuild project + IAM role per app)
│   ├── api/codebuild/{project,role}/template.yaml
│   └── ui/codebuild/{project,role}/template.yaml
├── docs/
│   ├── ARCHITECTURE.md              # system design
│   └── CODING_STANDARDS.md          # this file
├── .husky/                # pre-commit → lint-staged, commit-msg → commitlint
├── docker-compose.yml       # Postgres 16 + Redis 7
├── turbo.json
└── pnpm-workspace.yaml
```

**Rule:** nothing shared or app-specific lives at repo root. Root only holds workspace glue (`package.json`, `turbo.json`, `pnpm-workspace.yaml`), git hooks, docker-compose, and docs.

---

## 2. Naming conventions

| What | Convention | Example |
|---|---|---|
| Folders (features/modules) | kebab-case | `work-orders/`, `delivery-challans/` |
| NestJS files | kebab-case + type suffix | `work-orders.controller.ts`, `create-work-order.dto.ts` |
| React components | PascalCase file = PascalCase export | `WorkOrderTable.tsx` |
| Component folders (ui-kit primitives) | kebab-case folder, `index.tsx` inside | `components/date-picker/index.tsx` |
| Hooks | camelCase, `use` prefix | `useWorkOrders.ts` |
| Prisma models | PascalCase singular | `model WorkOrder { ... }` |
| DB table/column names (via `@@map`/`@map`) | snake_case | `work_orders`, `organization_id` |
| Branches | `<type>/<ticket-or-slug>` | `feat/production-work-order-crud` |
| Commits | Conventional Commits (enforced by commitlint) | `feat(production): add work order status transitions` |
| Permission strings | `<module>.<entity>.<action>` | `production.work_order.approve` |

---

## 3. Backend module standard (NestJS)

Every feature module — no exceptions, no "just this once it's simpler inline":

```
work-orders/
├── work-orders.module.ts
├── work-orders.controller.ts
├── work-orders.controller.spec.ts
├── work-orders.service.ts
├── work-orders.service.spec.ts
├── work-orders.repository.ts
├── dto/
│   ├── create-work-order.dto.ts
│   ├── update-work-order.dto.ts
│   └── query-work-order.dto.ts
└── entities/                      # only if response shape differs from the Prisma model
```

- **Controller**: routing, request/response shape, validation pipe, guards. No business logic.
- **Service**: business rules. Depends on the repository via constructor injection (interface/token, never a direct Prisma import).
- **Repository**: the *only* place `PrismaService` is called. If you find yourself calling `this.prisma.workOrder.*` inside a service, that's a standards violation — move it to the repository.
- Nothing feature-specific goes in `apps/api/src/shared/` — that folder is for infra used by 2+ modules (auth guards, logging, email, encryption, cache). If only one module uses it, it lives inside that module.

---

## 4. Frontend standard (Next.js)

- `app/` = routing only. Route groups (`(authenticated)`, `(unauthenticated)`) control layout/auth, nothing else.
- `features/<module>/` = all real code for that module: `components/`, `hooks/`, `api.ts`, `schema.ts`. The `app/` page file imports from here and stays thin.
- `components/<primitive>/index.tsx` (in `packages/ui-kit` or `apps/ui/src/components`) = dumb, reusable, no API calls, no domain knowledge. A button, a modal, a date picker.
- `components/widgets/` or `features/<module>/components/` = composed, domain-aware (`WorkOrderStatusBadge`, `BomLineEditor`). If a component reads from `statuses` or calls a hook that hits the API, it's a widget — it does not belong in `ui-kit`.

---

## 5. SOLID — applied concretely, not as theory

This is the part that answers "should I write a new function or reuse one" on every PR.

### S — Single Responsibility
A service method does **one** of: fetch/persist data, apply a business rule, or shape a response — never two. If `WorkOrdersService.create()` is validating BOM availability *and* writing stock ledger entries *and* formatting the API response, split it into three collaborators (a validator, a stock-ledger writer injected as a dependency, and a mapper).

### O — Open/Closed
Prefer **extending via data or event listeners** over editing existing service code:
- New status? Insert a row into `statuses`. Don't add an `if` branch to existing logic.
- New behavior when a work order completes? Add a new `@OnEvent('work-order.completed')` listener in the new module. Don't edit `WorkOrdersService` to know about inventory, dispatch, etc.
- New optional field a client asked for? `custom_fields` JSON key, not a migration + service edit, *unless* it needs to be queried/filtered/joined — then it earns a real column.

### L — Liskov Substitution
Avoid class inheritance for "special case" business rules (e.g., `ExportSalesOrder extends SalesOrder`). ERP edge cases multiply fast and inheritance hierarchies get brittle. Prefer composition: small, injectable strategy functions/classes (`TaxCalculationStrategy`, `PricingRule`) passed in, swapped per case.

### I — Interface Segregation
One DTO per operation, always. `create-work-order.dto.ts` ≠ `update-work-order.dto.ts` ≠ `query-work-order.dto.ts`. Never a single `WorkOrderDto` that every endpoint imports and half-ignores.

### D — Dependency Inversion
Services depend on repository **tokens/interfaces**, injected by Nest's DI container — never `import { PrismaService }` directly inside a service, and never `new SomeClass()` inside business logic. This is what makes swapping an implementation (e.g., adding a cache layer, or splitting a module into its own service later) a one-file change.

```ts
// ✅ service depends on an injected repository, not Prisma directly
@Injectable()
export class WorkOrdersService {
  constructor(private readonly repo: WorkOrdersRepository) {}
}

// ❌ service reaches into Prisma directly — violates DIP, breaks the repository boundary
@Injectable()
export class WorkOrdersService {
  constructor(private readonly prisma: PrismaService) {}
}
```

---

## 6. "Reuse, don't recreate" — where does this code go?

Before writing a new function, check in this order:

1. **Does `packages/core` already have this?** (validation schema, cost calc, formatting rule, anything used by more than one app-surface). If yes, import it. If it's business logic used by both `ui` and `mobile` (or will be), and it doesn't exist yet — it goes in `packages/core`, not copy-pasted into both.
2. **Does `apps/api/src/shared/` already have this?** (encryption, cache, email, logging, guards, interceptors). If it's infra used by 2+ backend modules, it lives here.
3. **Does `packages/ui-kit` already have this component?** Check before building a new date picker, modal, table.
4. **Is this a cross-module platform concern** (status history, attachments, approvals, audit, comments — §6.4 of the architecture guide)? These tables/services already exist in `platform/`. A new module **consumes** them via `entity_type`/`entity_id`, it does not build its own versions.
5. Only after all four are "no" — write new code, and put it in the most specific location that matches §1's layout, not the most convenient one.

**Enforcement, not just convention:** `packages/config`'s ESLint includes `sonarjs/no-identical-functions` (flags near-duplicate logic across files) and `import/no-duplicate-imports`. A PR that trips either should get a "pull this into `core`/`shared`" comment before merge, not a lint-disable.

---

## 7. Testing standard

- Unit tests (`.spec.ts`) live next to the file they test — `work-orders.service.spec.ts` beside `work-orders.service.ts`. Vitest, not Jest, per the api scaffold.
- Every service method with a business rule (not just CRUD passthroughs) needs a test for the rule, not just the happy path — e.g., "can't close a work order with an open QA hold" needs a test that asserts the rejection.
- e2e/contract tests live in `apps/api/test/` — this is where API-shape stability gets enforced before `ui`/`mobile` break against a changed DTO.
- Frontend: Cypress, Gherkin-style (`.feature` + `.steps.ts`), fixtures per domain under `cypress/fixtures/responses/<domain>/`.

---

## 8. Git workflow

- Branch per feature: `feat/<module>-<short-description>`, `fix/...`, `chore/...`.
- Conventional commits (enforced by commitlint — non-conforming commits are rejected locally at `commit-msg`).
- PRs must pass `turbo run lint typecheck test` in CI before review.
- One module/feature per PR where possible — a PR touching `sales/` and `accounts/` together should be a signal to check whether it should've been an event listener instead of a direct cross-module import.

---

## 9. PR review checklist (paste into PR template)

- [ ] Controller has no business logic; Service has no direct Prisma calls; Repository is the only Prisma consumer.
- [ ] New DTOs are operation-specific (create/update/query), not a shared bloated DTO.
- [ ] Any logic that could be needed by `ui` *and* `mobile` is in `packages/core`, not duplicated.
- [ ] No new hardcoded status/enum — uses the `statuses` table if this is a workflow state.
- [ ] Cross-module effects go through `EventEmitter2`, not a direct import of another module's service/repository.
- [ ] New table follows the baseline (§6.1 of the architecture guide): `organization_id`, `custom_fields`, `created_by/updated_by`, `created_at/updated_at`, `deleted_at`.
- [ ] Tests added for business rules, not just CRUD.
- [ ] Checked `packages/core`, `apps/api/src/shared`, and `packages/ui-kit` before writing new shared-shaped code.
- [ ] No hardcoded hex/px colors or font sizes — uses tokens from `packages/ui-kit/src/theme.css` (see `docs/DESIGN_SYSTEM.md`), including a `dark:` pair for every color utility.
