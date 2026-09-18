# FAS ERP — Coding Standards & Folder Structure Reference

**For every contributor.** If you're adding a file and you're not sure where it goes, this doc answers that before you ask in Slack. Companion doc: `FAS_ERP_Architecture_Guide.md` (system design, data model, module boundaries) — this doc is about _how we write code inside that architecture_.

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
│   ├── FAS_ERP_Architecture_Guide.md    # system design
│   ├── FAS_ERP_CODING_STANDARDS.md      # this file
│   └── FAS_ERP_DESIGN_SYSTEM.md         # design tokens & component contracts
├── .husky/                # pre-commit → lint-staged, commit-msg → commitlint
├── docker-compose.yml       # Postgres 16 + Redis 7
├── turbo.json
└── pnpm-workspace.yaml
```

**Rule:** nothing shared or app-specific lives at repo root. Root only holds workspace glue (`package.json`, `turbo.json`, `pnpm-workspace.yaml`), git hooks, docker-compose, and docs.

---

## 2. Naming conventions

| What                                       | Convention                                    | Example                                                 |
| ------------------------------------------ | --------------------------------------------- | ------------------------------------------------------- |
| Folders (features/modules)                 | kebab-case                                    | `work-orders/`, `delivery-challans/`                    |
| NestJS files                               | kebab-case + type suffix                      | `work-orders.controller.ts`, `create-work-order.dto.ts` |
| React components                           | PascalCase file = PascalCase export           | `WorkOrderTable.tsx`                                    |
| Component folders (ui-kit primitives)      | kebab-case folder, `index.tsx` inside         | `components/date-picker/index.tsx`                      |
| Hooks                                      | camelCase, `use` prefix                       | `useWorkOrders.ts`                                      |
| Prisma models                              | PascalCase singular                           | `model WorkOrder { ... }`                               |
| DB table/column names (via `@@map`/`@map`) | snake_case                                    | `work_orders`, `organization_id`                        |
| Branches                                   | `<type>/<ticket-or-slug>`                     | `feat/production-work-order-crud`                       |
| Commits                                    | Conventional Commits (enforced by commitlint) | `feat(production): add work order status transitions`   |
| Permission strings                         | `<module>.<entity>.<action>`                  | `production.work_order.approve`                         |

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
- **Repository**: the _only_ place `PrismaService` is called. If you find yourself calling `this.prisma.workOrder.*` inside a service, that's a standards violation — move it to the repository. Call `getOrgScope()`/`buildScopedWhere()` (§16) in every repository method that reads/writes tenant data.
  This is lint-enforced, not just a convention: `apps/api/eslint.config.mjs` flags a controller/service importing Prisma directly, and flags any module/platform folder importing _another_ module/platform folder's `*.repository.ts` (via `eslint-plugin-boundaries`) — see the root `CLAUDE.md`'s "Enforcement" section for the complete automatic-vs-review-only list. Whether a given method actually _called_ `getOrgScope()`/`buildScopedWhere()` is not lint-enforced (§16 explains why) — that's still a review catch.
- **Entities**: mandatory when a response shape differs from the Prisma model (e.g. hiding `password_hash`, flattening a relation into a scalar field) — skip otherwise; returning the Prisma model as-is is fine when it's already the right shape. See §12.
- Nothing feature-specific goes in `apps/api/src/shared/` — that folder is for _injectable infra services_ used by 2+ modules (Prisma, Redis, email, encryption, cache). `apps/api/src/common/` is a related but distinct folder: _request-pipeline framework primitives_ — filters, interceptors, decorators, DTOs, constants, exceptions — that plug into Nest's pipeline rather than being injected as a service. If only one module uses something, it lives inside that module either way.

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

A service method does **one** of: fetch/persist data, apply a business rule, or shape a response — never two. If `WorkOrdersService.create()` is validating BOM availability _and_ writing stock ledger entries _and_ formatting the API response, split it into three collaborators (a validator, a stock-ledger writer injected as a dependency, and a mapper).

### O — Open/Closed

Prefer **extending via data or event listeners** over editing existing service code:

- New status? Insert a row into `statuses`. Don't add an `if` branch to existing logic.
- New behavior when a work order completes? Add a new `@OnEvent('work-order.completed')` listener in the new module. Don't edit `WorkOrdersService` to know about inventory, dispatch, etc.
- New optional field a client asked for? `custom_fields` JSON key, not a migration + service edit, _unless_ it needs to be queried/filtered/joined — then it earns a real column.

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

**Enforcement, not just convention:** `packages/config`'s ESLint includes `sonarjs/no-identical-functions` (flags near-duplicate logic across files) and `no-duplicate-imports` (ESLint core — no plugin needed, despite this doc previously calling it `import/no-duplicate-imports`; `eslint-plugin-import`'s flat-config release doesn't actually expose a rule under that name). A PR that trips either should get a "pull this into `core`/`shared`" comment before merge, not a lint-disable.

---

## 7. Testing standard

- Unit tests (`.spec.ts`) live next to the file they test — `work-orders.service.spec.ts` beside `work-orders.service.ts`. Vitest, not Jest, per the api scaffold.
- Every service method with a business rule (not just CRUD passthroughs) needs a test for the rule, not just the happy path — e.g., "can't close a work order with an open QA hold" needs a test that asserts the rejection.
- e2e/contract tests live in `apps/api/test/` — this is where API-shape stability gets enforced before `ui`/`mobile` break against a changed DTO.
- Frontend: **Playwright** (`apps/ui/playwright.config.ts`, `apps/ui/e2e/`) — the one browser-test runner in this repo; see §20 for the responsive/dark-mode pattern to extend per module. There is no Cypress here and no plan to add it — an earlier draft of this doc specified Cypress, but Playwright is what's actually wired up and it covers the same need (viewport + visual/dark-mode checks), so don't introduce a second runner.

---

## 8. Git workflow

- Branch per feature: `feat/<module>-<short-description>`, `fix/...`, `chore/...`.
- Conventional commits (enforced by commitlint — non-conforming commits are rejected locally at `commit-msg`).
- PRs must pass CI before review: `turbo run lint typecheck test build` (`.github/workflows/ci.yml`'s `lint-typecheck-test-build` job) plus the `ui-browser-smoke` job (Playwright, `apps/ui/e2e/`).
- One module/feature per PR where possible — a PR touching `sales/` and `accounts/` together should be a signal to check whether it should've been an event listener instead of a direct cross-module import.

---

## 9. PR review checklist (paste into PR template)

- [ ] Controller has no business logic; Service has no direct Prisma calls; Repository is the only Prisma consumer.
- [ ] New DTOs are operation-specific (create/update/query), not a shared bloated DTO.
- [ ] Any logic that could be needed by `ui` _and_ `mobile` is in `packages/core`, not duplicated.
- [ ] No new hardcoded status/enum — uses the `statuses` table if this is a workflow state.
- [ ] Cross-module effects go through `EventEmitter2`, not a direct import of another module's service/repository.
- [ ] New table follows the baseline (§6.1 of the architecture guide): `organization_id`, `custom_fields`, `created_by/updated_by`, `created_at/updated_at`, `deleted_at`.
- [ ] Tests added for business rules, not just CRUD.
- [ ] Checked `packages/core`, `apps/api/src/shared`, and `packages/ui-kit` before writing new shared-shaped code.
- [ ] No hardcoded hex/px colors or font sizes — uses tokens from `packages/ui-kit/src/theme.css` (see `docs/FAS_ERP_DESIGN_SYSTEM.md`), including a `dark:` pair for every color utility.
- [ ] Repository methods that read/write tenant data use `getOrgScope()`/`buildScopedWhere()` (§16), not a hand-rolled `organizationId` filter — and if a filter is merged in, scope is spread _after_ it, never before.
- [ ] New business rule throws a `BusinessException` subclass (§13), not a raw `HttpException`.
- [ ] No magic strings for permission codes, cookie/cache keys, or routes — a `const` object in `common/constants`, `packages/core/src/constants`, or `apps/ui/src/constants` (§10).
- [ ] List endpoints return a `PaginatedResponseDto` via `@Paginate()` (§15), not hand-parsed `page`/`limit` query params.

---

## 10. Constants

No magic strings for anything that's checked, compared, or reused more than once — cookie names, cache-key prefixes, permission codes, route paths, storage keys. Where a constant lives depends on who needs it:

| Needed by                                       | Location                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api` only                                 | `apps/api/src/common/constants/<name>.constants.ts` (a single `export const X = {...} as const` object, not scattered `export const`s)                                                                                                                                                                                                                                                                                                                                                                  |
| `apps/ui` only                                  | `apps/ui/src/constants/<name>.ts` (`routes.ts`, `api-endpoints.ts`, `storage-keys.ts` exist as the starting set)                                                                                                                                                                                                                                                                                                                                                                                        |
| Both `apps/api` **and** `apps/ui`/`apps/mobile` | `packages/core/src/constants/<name>.constants.ts` — the single source of truth; consumers re-export from there instead of hand-copying values. Example: `PERMISSIONS` in `packages/core/src/constants/permissions.constants.ts`, needed by `apps/api`'s guards, `packages/database`'s seed script, and eventually `apps/ui`'s permission-gated UI. `apps/api/src/common/constants/permissions.constants.ts` just re-exports it — the file exists at the expected path, but there's one canonical value. |
| Only within one module                          | Colocated next to the code that uses it (e.g. `packages/core/src/auth/auth.constants.ts` for `auth-client.ts`'s endpoint paths) rather than a shared file no one else needs.                                                                                                                                                                                                                                                                                                                            |

## 11. Type convention: what goes where

Three tiers, never mixed:

1. **`packages/api-types`** — _only_ types that cross the API↔UI boundary (request/response shapes). Meant to be OpenAPI-generated eventually — `apps/api` now serves a Swagger spec (`/api-docs`, see `main.ts`) specifically so that pipeline is possible — but until a `generate` script exists, these are hand-written and kept in sync by hand with the backend DTOs/entities that produce them. No class-transformer/class-validator decorators here; keep it framework-agnostic.
2. **Per-app internal types** — a co-located `types.ts` next to the module that owns them. Not needed by any other app/package, so they don't belong in a shared package.
3. **Prisma types** — the DB source of truth, used inside `apps/api`'s repositories/services. **Never returned directly from a controller or leaked across the API boundary** — map to an entity (§12) or a plain DTO shape matching `packages/api-types` first.

`packages/api-types` = wire shape source of truth. Prisma types = DB source of truth. They're allowed to look similar; they're never the same type.

## 12. Entities (class-transformer)

`ClassSerializerInterceptor` is registered globally (`apps/api/src/common/common.module.ts`, as an `APP_INTERCEPTOR`), so any class instance returned from a controller gets serialized through class-transformer automatically.

**Mandatory** when a response shape differs from the Prisma model — most commonly hiding a sensitive column or flattening a relation into a scalar. **Skip** when the Prisma model's shape is already the right response shape; don't wrap something in an entity class just to have one.

Pattern (see `apps/api/src/platform/auth/entities/user.entity.ts`):

```ts
export class UserEntity {
  @Expose() id: number;
  @Expose() email: string;
  // ...every field that should reach the client

  @Exclude() passwordHash?: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  // A static fromX() factory is the usual shape when the entity needs to
  // flatten relations (e.g. plantAccess[0]?.plantId -> activePlantId) —
  // keeps that mapping in one place instead of duplicated at every call site.
  static fromUser(row: AuthUserRow): UserEntity {
    /* ... */
  }
}
```

Construct the entity from the **raw** row (including the sensitive field) rather than manually omitting it beforehand — that's what makes `@Exclude()` a real guarantee instead of decorative: the interceptor strips it at serialization time no matter how the entity got built, instead of relying on every mapper to remember to leave it out.

## 13. Global error handling

`apps/api/src/common/filters/all-exceptions.filter.ts` (`@Catch()` everything) turns every thrown error into the same response shape:

```json
{
  "statusCode": 401,
  "message": "Invalid email or password",
  "error": "Unauthorized",
  "path": "/auth/login",
  "timestamp": "...",
  "correlationId": "..."
}
```

Never includes a stack trace in the response body, in any environment — the full error (with stack) goes to structured logs (§14) instead, keyed by the same `correlationId` a client/support ticket can hand back for lookup.

**Throw a `BusinessException` subclass for business-rule violations**, not a raw `HttpException` — it's what lets the filter (and future code) distinguish "an expected, named business error" from an arbitrary framework exception, and it carries an `errorCode` (e.g. `RESOURCE_NOT_FOUND`) that becomes the response's `error` field instead of a generic HTTP status name. See `apps/api/src/common/exceptions/business.exception.ts`: `BusinessException` (abstract base) → `ResourceNotFoundException`, `ResourceConflictException` today. Add more subclasses as real modules need them, following the same shape — don't build a speculative full taxonomy ahead of need.

Nest's own built-in exceptions (`UnauthorizedException`, `ForbiddenException`, `BadRequestException`, ...) are still fine for framework-level rejections (auth, validation) — `BusinessException` is specifically for domain rules a service enforces.

## 14. Structured logging & correlation IDs

`nestjs-pino` (JSON-structured, env-driven `LOG_LEVEL`) replaces Nest's default logger globally (`app.useLogger(app.get(Logger))` in `main.ts`). Inject Nest's own `Logger` (or `PinoLogger`/`@InjectPinoLogger` for more control) — existing `new Logger(ClassName.name)` call sites get structured output automatically, no per-file change needed.

**Every request gets a `correlationId`**, generated before any tenancy/business logic runs and carried through:

- every log line for that request (via `pinoHttp.customProps`),
- `AllExceptionsFilter`'s response body (§13),
- the CLS store (`cls.get("correlationId")`), for anything else that needs it.

Implementation note for anyone touching this: it's **not** a dedicated "runs first" middleware — Nest doesn't guarantee middleware mount order strongly enough to depend on that. `apps/api/src/common/utils/correlation-id.util.ts`'s `getOrCreateCorrelationId(req)` is idempotent (honors an incoming `x-correlation-id` header, else generates one, caches it on `req`), and both `TenancyModule`'s CLS setup and nestjs-pino's `genReqId` call the same function — whichever runs first for a given request generates it, the other just reads it back. This makes "correlation id exists before tenancy logic runs" true by construction instead of by import-order assumption.

Never log secrets: `redact` in `common/logger/logger.module.ts` covers `req.headers.authorization`/`req.headers.cookie` — extend that list, don't log request bodies containing passwords/tokens directly.

## 15. Response envelope & pagination

Every successful response is wrapped as `{ data, meta }` by `ResponseInterceptor` (`apps/api/src/common/interceptors/response.interceptor.ts`, registered globally). `packages/core/src/api/client.ts` unwraps it centrally, so frontend call sites work against the inner shape and never see the envelope directly.

**Opting out** (raw response bodies, e.g. `GET /health`'s Terminus shape): decorate the route with `@RawResponse()`.

**Pagination**: use `@Paginate()` (`common/decorators/paginate.decorator.ts`) to get a validated `PaginationDto` instead of parsing `page`/`limit` query params by hand:

```ts
@Get()
findAll(@Paginate() pagination: PaginationDto) {
  return this.workOrdersRepository.findMany(pagination); // -> PaginatedResponseDto
}
```

(The repository reads org/plant scope itself via `getOrgScope()`/`buildScopedWhere()` — §16 — rather than the controller passing it through; there is no `@OrgScoped()` _parameter_ decorator, and no scope argument for the controller to thread here.)

Return a `PaginatedResponseDto<T>` (`common/dto/paginated-response.dto.ts`) from the service/repository — `ResponseInterceptor` detects it via `instanceof` and unwraps it into `{ data: items, meta: { page, limit, total, totalPages } }` automatically.

## 16. `getOrgScope()` / `buildScopedWhere()`

Every repository method that reads/writes tenant data must be scoped by `organizationId` (and `plantId` for the plant-owned bucket — see Architecture Guide §7A). `apps/api/src/common/utils/org-scope.util.ts` exports two functions a repository method calls in its own body:

- `getOrgScope(options?)` → `{ organizationId, plantId? }`, read from CLS (see Architecture Guide §7). Throws if `organizationId` is missing — a repository method is only ever called from within a request that's passed through `TenancyModule`'s CLS middleware.
- `buildScopedWhere(filter, options?)` → merges a caller-supplied filter with the scope for a Prisma `where` clause, **scope always winning on a key collision**. Use this one whenever the method also takes a filter object; use plain `getOrgScope()` when there's no filter to merge.

```ts
@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(filter?: WorkOrderFilter) {
    // plantScoped: true — work_orders is plant-owned, see Architecture Guide §7A
    const where = buildScopedWhere(filter, { plantScoped: true });
    return this.prisma.workOrder.findMany({ where });
  }
}
// caller — no scope argument to pass, same as before:
this.workOrdersRepository.findMany(filter);
```

**Why this is a plain function, not a decorator that injects the scope as a hidden first argument** (an earlier version of this pattern, and this doc, had exactly that): TypeScript's decorator types do not let a decorator change the externally-visible parameter list of the method it decorates. A caller writing `this.repo.findMany(filter)` against a method _declared_ as `findMany(scope: OrgScope, filter?: WorkOrderFilter)` fails to type-check — `tsc` reports "Expected 2 arguments, but got 1" regardless of what the decorator does at runtime. The only way to make that call site type-check was an `as unknown as (...)` cast, which is worse than no protection: an unsafe cast is easy to copy-paste into the wrong place and easy to stop noticing in review. A plain function call has no such conflict — ordinary TypeScript checks it normally, and there's no hidden argument for anyone to get wrong.

**What's structural vs. review-only here:** `buildScopedWhere`'s merge order (scope spread _after_ the filter, and `Omit<F, "organizationId" | "plantId">` on the filter's type) makes "a filter's `organizationId` overriding the real tenant scope" impossible by construction — that part doesn't rely on a reviewer catching it. "Did this repository method call `getOrgScope()`/`buildScopedWhere()` at all, instead of hand-rolling a filter" is **not** structurally enforced (there's no decorator or lint rule that can prove a method used the right helper) — that's still a code-review catch, same as any other convention. Don't describe this as "structurally impossible to forget" in a PR or a new module's docs; say what's actually true — the merge-order safety is structural, the "remembered to call it" part is not.

Set `plantScoped: true` for plant-owned-bucket tables; leave it unset for org-shared-catalog tables (Architecture Guide §7A's table).

## 17. Cross-module events (`EventEmitter2`)

**This is the rule most likely to get silently violated once several people are building modules under deadline pressure — read this section before importing another module's repository/service.**

**The rule:** a **fire-and-forget side effect** that another module reacts to goes through `EventEmitter2` — a module **never** directly imports another module's repository to trigger one. If `production` needs `inventory` to react when a work order completes, `production` emits an event; `inventory` subscribes. `production` never calls into `inventory`'s repository directly, and doesn't know or care who's listening.

This is not "every cross-module interaction must be an event." Two things `EventEmitter2` genuinely cannot give you:

- **Durability.** `@nestjs/event-emitter`'s `EventEmitter2` is in-process and synchronous-by-default — an emit during a request that then crashes before the listener runs (or a listener that throws) is simply lost; there is no persisted queue, retry, or outbox behind it. It is the right tool for "let other modules react if they're listening," not for "this side effect must eventually happen." Don't describe it as reliable/durable in a PR or a new module's docs. Building actual durable delivery (transactional outbox, a real queue) is explicitly out of scope for this foundation task — if a module genuinely needs it, that's a deliberate follow-up to raise, not something to bolt on ad hoc.
- **A return value.** If module A genuinely needs an answer back from module B synchronously to decide what to do next (not just "notify B, don't care what happens"), that's _coordination_, not a side effect, and forcing it through an event (e.g. emit-then-poll) is worse than a explicit call. The approved escape hatch: module B exposes a small, intentional **public service method** (not its repository) that module A's service is allowed to inject and call directly — e.g. `production`'s service constructor-injecting `InventoryAvailabilityService` (a public class `inventory` exports from its module) to check stock before confirming a work order, while `inventory`'s _repository_ stays private to `inventory`. Keep this exception narrow and explicit (a named public service, not "just import whatever you need") — if it's a plain data-fetch, a shared read-only query service works too; if two modules end up needing many of these synchronous calls to each other, that's usually a sign the module boundary itself is wrong, worth raising rather than adding more direct calls.

**Convention:**

- Every module that emits events gets an `events/` folder: `work-orders/events/work-order.created.event.ts`.
- Event name strings: `<module>.<entity>.<event>`, e.g. `work-order.completed`, `user.logged_in`. Define the string as a `const` (e.g. `WORK_ORDER_EVENTS.COMPLETED`), not a bare string literal at each `emit`/`@OnEvent` call site.
- Event file: one class per event, named `<entity>-<past-tense-verb>.event.ts`, carrying only the data a listener needs (IDs + a few fields, not a full entity graph) — e.g. `UserLoggedInEvent { userId, organizationId, occurredAt }`.
- Emitting is a **pure addition** after a service method's existing logic — it must never change that method's return value or behavior. If a "business rule" needs synchronous cross-module coordination (not just a side effect), that's a sign it shouldn't be split across modules that way, not a reason to reach for a direct import.
- Listeners live in the _subscribing_ module (`inventory/listeners/work-order-completed.listener.ts`), using `@OnEvent(WORK_ORDER_EVENTS.COMPLETED)` — never in the emitting module.

**Proof-of-wiring example** (platform-level, since no business module exists yet to demonstrate the real cross-module case): `platform/auth` emits `user.logged_in` on successful login (`AuthService.login()`, `apps/api/src/platform/auth/events/user-logged-in.event.ts`), and `UserLoggedInListener` (`apps/api/src/platform/auth/listeners/user-logged-in.listener.ts`) subscribes via `@OnEvent()` and logs it. It's same-module here only because nothing else exists yet to subscribe from — the point is that the call is genuinely decoupled (emit, don't invoke), which is what the real cross-module case relies on. A real listener follows the exact same `@OnEvent()` shape from inside its own module instead.

**PR review question to ask**: does this PR touch two modules' folders? If yes, check whether it should have been an event listener instead (see §9's checklist) — a PR touching `sales/` and `accounts/` together is the signal, not a rule violation by itself, but it's worth a second look every time.

## 18. Guards vs. interceptors

**Authentication and authorization are always Guard-based** (`JwtAuthGuard`, `PermissionsGuard`, `apps/api/src/platform/auth/guards/`) — never build an interceptor that checks who a request is or what it's allowed to do. Interceptors are reserved for response transformation and cross-cutting concerns that don't gate access: `ClassSerializerInterceptor` (§12), `ResponseInterceptor` (§15).

This isn't a stylistic preference: Nest runs Guards before Interceptors in the request pipeline, and Guards are designed to short-circuit a request (return `false`/throw) before a handler ever runs. An interceptor that tried to do the same job would run too late relative to other guards, or have to reimplement that short-circuit by hand via the `CallHandler`. If a new module thinks it needs an "auth interceptor," that's a sign to add a Guard instead, not a new pattern.

## 19. UI error handling — API errors to toasts

Every API call from `apps/ui` throws `ApiError` on a non-2xx response (`packages/core/src/api/client.ts`), carrying the same `message` the backend's `AllExceptionsFilter` puts in the response body (§13). Forms surface that error the same way everywhere:

- `apps/ui/src/lib/api-error.ts` → `getApiErrorMessage(error: unknown): string` — the one place that maps an `ApiError` (or anything else) to a user-facing string. Extend this, don't add a second `err instanceof ApiError ? ... : ...` ternary at a new call site.
- `apps/ui/src/hooks/use-api-error-toast.ts` → `useApiErrorToast()` — a hook returning `(error: unknown) => void` that shows the mapped message as an error toast. Call it from a form's `catch` block; see `apps/ui/src/features/auth/components/LoginForm.tsx` for the reference usage.
- `apps/ui/src/components/Toast` → the underlying `ToastProvider`/`useToast()` primitive (mounted once in `apps/ui/src/app/layout.tsx`). It's domain-agnostic — `useToast().success(...)`/`.warning(...)`/`.info(...)` are also available for non-error notifications — so a new module reaches for it directly rather than building its own toast UI.

This lives in `apps/ui`, not `packages/ui-kit`: the DOM toast viewport isn't something `apps/mobile` (React Native) can reuse as-is, unlike the framework-agnostic pieces in `packages/core`.

## 19A. Frontend data fetching (TanStack Query)

`@fas-erp/core`'s `apiClient` (§19) is the transport; TanStack Query is the server-cache layer on top of it — the pairing named in `FAS_ERP_Architecture_Guide.md` §1. `apps/ui/src/lib/query-client.tsx`'s `QueryProvider` is mounted once in `app/layout.tsx`, inside `ToastProvider` and outside `AuthProvider` (order matters: `AuthProvider.logout()` needs `useQueryClient()`, so it must render _under_ `QueryProvider`).

**Query keys must be organization/plant-aware.** Two users in different organizations — or the same user after switching plants, once that exists — must never share a cache entry:

```ts
useQuery({
  queryKey: ["work-orders", "list", user.organizationId, user.activePlantId, filters],
  queryFn: () => apiClient.request<PaginatedResponse<WorkOrder>>(`/production/work-orders?...`),
  enabled: status === "authenticated",
});
```

See `apps/ui/src/features/auth/hooks/use-permission-check.ts` for the reference hook (backed by the real `GET /auth/permission-check` route) — this is what a new feature's query hooks should look like: typed response, org/plant-scoped key, `enabled` gated on auth status rather than fetching before there's a session.

**Logout clears the cache.** `AuthProvider.logout()` (`apps/ui/src/features/auth/auth-context.tsx`) calls `queryClient.clear()` after clearing the access token — without this, a fast logout→login-as-someone-else sequence could flash the previous user's cached data on first render. An org/plant _switch_ (once that UI exists) needs the same treatment — either `queryClient.clear()` again, or `removeQueries` scoped to the old org/plant's key prefix if some org-independent data is worth keeping warm.

**Pending requests during a context change**: because query keys are namespaced by `organizationId`/`activePlantId`, a request that was in flight for the _previous_ org/plant simply resolves into a cache entry nothing reads anymore once those values change — no manual cancellation wiring needed for that case specifically. `AbortSignal`-based cancellation (TanStack Query passes one to `queryFn` automatically) is still worth wiring into `apiClient.request` if a fast-typing filter/search UI ever needs to cancel a superseded in-flight request; not needed yet, don't add it speculatively.

**Server vs. Client Components**: every hook above is `"use client"` — TanStack Query's cache is a client-side concern. `app/` route files can still be Server Components for layout/initial markup; a page that needs live/authenticated data renders a client child that calls these hooks, the same split `app/page.tsx` already uses for `useAuth()`.

## 20. Responsive standard

Every screen/component is built **mobile-first**: base Tailwind classes target the smallest supported viewport, and `sm:`/`md:`/`lg:`/`xl:` prefixes layer up from there — never the reverse (i.e. never a desktop-first base with a `max-sm:` override).

- **Minimum tested breakpoints**: 375px (mobile), 768px (tablet), 1280px+ (desktop). Verify with Playwright viewport resizing (`apps/ui/playwright.config.ts`, `apps/ui/e2e/`) rather than eyeballing desktop only — `apps/ui/e2e/responsive.spec.ts` is the pattern to extend per-module (reuse its `VIEWPORTS` map), alongside the light/dark check in the same file. Run via `pnpm --filter ui test:e2e` (needs a one-time `pnpm --filter ui exec playwright install chromium`); kept as a separate script rather than folded into the default `turbo run test` pipeline, same reasoning as apps/api's `test:e2e` (§7) — it needs a running server and installed browser binaries that CI opts into deliberately, not something every `test` invocation should require.
- **Touch targets**: every interactive element (buttons, form inputs, nav items) has a minimum 44x44px tap area on mobile widths — use `h-11`/`w-11` (Tailwind's standard 4px scale, not an arbitrary value) rather than relying on padding alone to get there. This matters now, not just for the current screen: `apps/mobile` (Expo) will eventually share `packages/core` with this UI, and touch-target sizing decided correctly here doesn't need relearning there.
- **No shared layout shell/nav assumes desktop width**: no fixed-px sidebar that overflows a 375px viewport, no horizontal scroll on a table or form at 375px (wrap in a scroll container with `overflow-x-auto` deliberately if a table genuinely can't reflow, don't let it happen by accident).
- Every color/spacing/shadow/type-scale value still comes from `packages/ui-kit/src/theme.css` per `docs/FAS_ERP_DESIGN_SYSTEM.md` — responsive work is not an excuse for an ad-hoc `text-[13px]` or `p-[18px]` to make something "fit."

## 21. Reference implementation

`platform/auth` (`apps/api/src/platform/auth/`) + `features/auth` (`apps/ui/src/features/auth/`) is the only real feature in this repo today, and it's the pattern every new module should match rather than inventing a different shape. It demonstrates, compiling and working end-to-end (verified live against the seeded demo org — not just typechecked):

- Controller → Service → Repository (§3), operation-specific DTOs (§5), the `{ data, meta }` envelope (§15), `UserEntity`'s `@Exclude(passwordHash)` pattern (§12), `BusinessException`/`AllExceptionsFilter` (§13), JWT access+refresh with Redis-backed rotation, `PermissionsGuard`/`@RequirePermission()` (§16's neighbor concern — RBAC, not tenant scope), and full Swagger/OpenAPI request+response documentation (`@ApiOperation`/`@ApiOkResponse`, see `auth.controller.ts`).
- Frontend: the API-client/auth-context/toast-error pattern (§19), and — as of the TanStack Query addition — a real org/plant-aware query hook (`apps/ui/src/features/auth/hooks/use-permission-check.ts`, §19A) rendered on the dashboard page with loading/error/success states.

It does **not** yet demonstrate a paginated list screen against `<DataTable />`/`<Pagination />` (§9A of `FAS_ERP_DESIGN_SYSTEM.md`) — there's no business list data to page through yet. The first real business module built on top of the scaffold below is the natural place for that to land; don't invent a fixture list just to exercise those components early.

## 22. Scaffolding

`tools/generate-module.mjs` generates a new module's Controller/Service/Repository/DTO skeleton (`apps/api/src/modules/[<domain>/]<name>/`) and a matching frontend feature folder (`apps/ui/src/features/[<domain>/]<name>/`), following §21's reference pattern exactly — every generated file is real, compiling TypeScript, not pseudocode.

```sh
node tools/generate-module.mjs <module-name> [--domain <domain>]
# e.g. node tools/generate-module.mjs work-orders --domain production
```

`<module-name>` must be kebab-case; the script refuses to overwrite an existing module directory. It does **not** invent a Prisma model, a permission string, or any business/authorization rule — every one of those is a `// TODO` in the generated output (a repository method literally `throw`s until you wire a real Prisma model in). After generating, you still have to:

1. Design the module's Prisma model(s) (`packages/database/prisma/schema.prisma`) and migrate — the baseline in Architecture Guide §6.1 plus the plant-scoping decision in §7A.
2. Register the generated `<Name>Module` in `apps/api/src/app.module.ts`.
3. Define and seed the permission string(s), and add `@RequirePermission()` to the routes that need it.
4. Fill in the DTOs' fields and the frontend hook's response type.
5. Write real tests for the module's business rules — the generated `.service.spec.ts` only proves the class constructs.

The scaffold's own output was verified before this was written: generated, registered temporarily, run through the full `lint`/`typecheck`/`test`/`build` pipeline (all green), then removed — see the CI/PR section below for what every _real_ module's PR must pass the same way.
