# FAS ERP — System Architecture & Build Guide

**Stack:** Next.js (ui) + NestJS (api) + PostgreSQL, single monorepo, mobile-ready
**Author's role:** Software Architect / Tech Lead reference doc

---

## 1. Architectural Decisions (made up front, so nothing downstream needs a rewrite)

| Decision              | Choice                                                                                                                                                                                                                             | Why                                                                                                                                                                                                                     |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Repo strategy         | **Monorepo** (pnpm workspaces + Turborepo)                                                                                                                                                                                         | ui, api, mobile, and shared types live together; one PR can touch a DTO and both consumers atomically                                                                                                                   |
| Backend               | **NestJS, modular monolith** (not microservices)                                                                                                                                                                                   | You have a small team (5 devs). Microservices now = distributed-systems tax with no payoff. Modular monolith with clean module boundaries lets you _peel off_ a service later (e.g., CMMS, Payroll) if you ever need to |
| ORM                   | **Prisma**                                                                                                                                                                                                                         | Fast to model, generates types shared with the API layer, excellent migration story. (TypeORM is the alternative — see note in §5)                                                                                      |
| DB                    | **PostgreSQL**, single database, **schema-per-concern is NOT used** — one schema, `organization_id` on every tenant table (row-level multi-tenancy)                                                                                | Simpler ops, easier cross-module joins/reports (a production ERP is _reporting-heavy_ — ledgers, stock reports, dashboards)                                                                                             |
| Multi-tenancy         | Shared DB, shared schema, **discriminator column** (`organization_id`) + Postgres **Row-Level Security (RLS)** as a second line of defense                                                                                         | Cheapest to run, safest against "forgot the WHERE clause" bugs because RLS enforces it at the DB layer even if application code slips                                                                                   |
| Multi-plant           | **Second tenancy level**: `plant_id` within an org, for companies running multiple manufacturing outlets/facilities. Built into the schema from day one even though FAS runs a single plant today — see §7A                        | Adding plant #2 later must be a data insert, never a migration or a re-architecture                                                                                                                                     |
| AuthN                 | JWT (access + refresh), Passport strategies                                                                                                                                                                                        | Standard, stateless, works for web + future mobile                                                                                                                                                                      |
| AuthZ                 | **RBAC**: User → Role → Permission, permissions checked via a NestJS Guard + decorator (`@RequirePermission('production.work_order.create')`)                                                                                      | Extensible — new modules just register new permission strings, no schema change                                                                                                                                         |
| Extensibility pattern | Every domain table: `id (serial integer)`, `organization_id`, `custom_fields jsonb`, `created_at/updated_at/created_by/updated_by`, `deleted_at` (soft delete), and **status via a `statuses` lookup table**, not a hardcoded enum | This is the single biggest lever for "won't need to rebuild when we add a feature" — see §6                                                                                                                             |
| API style             | REST (NestJS controllers) + OpenAPI (Swagger) auto-generated, **not GraphQL**                                                                                                                                                      | Simpler for a CRUD-and-workflow-heavy ERP; a shared `packages/api-types` package generated from OpenAPI keeps FE/BE in sync without GraphQL's added complexity                                                          |
| Frontend framework    | Next.js 14+ App Router                                                                                                                                                                                                             | SSR for dashboards/reports, route groups map cleanly to your 10 modules, works for both web app and (later) can share logic with React Native via `packages/core`                                                       |
| State/data-fetching   | TanStack Query (server cache) + Zustand (light client/UI state)                                                                                                                                                                    | Avoid Redux boilerplate; Query handles the "ERP is mostly server data" reality                                                                                                                                          |
| Mobile (future)       | **Expo (React Native)** in `apps/mobile`, sharing `packages/core` (API client, types, validation, business logic) with `ui`                                                                                                        | Expo lets one dev ship iOS+Android without native tooling overhead                                                                                                                                                      |

---

## 2. Monorepo Folder Structure (top level)

```
fas-erp/
├── apps/
│   ├── api/                     # NestJS backend
│   ├── ui/                      # Next.js frontend (web)
│   └── mobile/                  # Expo/React Native (scaffold now, build later)
├── packages/
│   ├── core/                    # framework-agnostic business logic, API client, validation (zod)
│   ├── api-types/                # API↔UI wire types (hand-written today, generation target — see below)
│   ├── ui-kit/                   # shared design-system components (web-focused, used by ui/)
│   ├── config/                   # shared eslint, tsconfig, prettier configs (no tailwind config here —
│   │                              # Tailwind v4 is CSS-first, see packages/ui-kit/src/theme.css)
│   └── database/                 # Prisma schema, migrations, seed scripts (owned/consumed by api)
├── docs/                         # FAS_ERP_Architecture_Guide.md / _CODING_STANDARDS.md / _DESIGN_SYSTEM.md
├── .github/workflows/            # CI/CD pipelines
├── docker-compose.yml            # local postgres/redis
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

> As implemented, there is no root `tsconfig.base.json` — the shared tsconfig lives at
> `packages/config/tsconfig.base.json` and every app/package extends it directly.
> `tools/` does exist, holding exactly one real script:
> `tools/generate-module.mjs` — see `FAS_ERP_CODING_STANDARDS.md`'s "Scaffolding" section. Don't add
> further tooling there speculatively; it earned its place because a real, repeated task needed it.

**Why this split matters:** `packages/database` (Prisma schema) is the single source of truth for your data model. `packages/api-types` is the API↔UI wire-type source of truth — **target state is OpenAPI-generated**, so ui/mobile can never drift from what api actually returns; **current state is hand-written** (see §11/§12 of `FAS_ERP_CODING_STANDARDS.md` for the exact status and what "generated" will mean once the pipeline lands). `packages/core` holds logic that both web and mobile need (e.g., "how do we compute BOM cost", form validation schemas) so you don't reimplement business rules twice.

---

## 3. Backend — `apps/api/` (NestJS)

NestJS already encourages a modular structure — lean into it hard. **One Nest module per business capability**, grouped into domains that match your 10 modules + platform concerns.

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   │
│   ├── platform/                        # cross-cutting, not a "business module"
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── strategies/              # jwt.strategy.ts, refresh.strategy.ts
│   │   │   ├── guards/                  # jwt-auth.guard.ts, permissions.guard.ts
│   │   │   └── decorators/              # @CurrentUser(), @RequirePermission()
│   │   ├── organizations/               # tenant CRUD, org settings
│   │   ├── users/
│   │   ├── roles-permissions/           # roles, permissions, role_permissions CRUD
│   │   ├── audit/                       # AuditInterceptor + audit_logs writer, read-only query API
│   │   ├── tenancy/                     # TenantContext (ALS/CLS), org-scoping interceptor
│   │   ├── documents-vault/             # Vault module: storage abstraction, access grants, approvals
│   │   └── notifications/               # email/SMS/push abstraction (used by many modules)
│   │
│   ├── modules/                         # the 10 business modules
│   │   ├── master-data/
│   │   │   ├── items/
│   │   │   ├── item-categories/
│   │   │   ├── uom/
│   │   │   ├── boms/
│   │   │   ├── routings/
│   │   │   ├── quality-parameters/
│   │   │   ├── warehouses/
│   │   │   ├── chart-of-accounts/
│   │   │   ├── hr-structures/           # departments, designations, shifts
│   │   │   └── sales-terms/
│   │   │
│   │   ├── sales/
│   │   │   ├── leads/
│   │   │   ├── quotations/
│   │   │   ├── sales-orders/
│   │   │   ├── customers/
│   │   │   ├── invoices/
│   │   │   ├── delivery-challans/
│   │   │   └── shipments/
│   │   │
│   │   ├── production/
│   │   │   ├── work-orders/
│   │   │   ├── work-order-operations/
│   │   │   └── qa-holds/
│   │   │
│   │   ├── inventory/
│   │   │   ├── stock-ledger/            # single source of truth: every stock movement
│   │   │   ├── raw-material-stock/      # views/services over stock-ledger
│   │   │   ├── finished-goods-stock/
│   │   │   └── stock-reports/
│   │   │
│   │   ├── quality/
│   │   │   ├── incoming-inspection/
│   │   │   ├── in-process-inspection/
│   │   │   └── quality-lots/
│   │   │
│   │   ├── dispatch/
│   │   │   ├── packing/
│   │   │   └── dispatch-records/
│   │   │
│   │   ├── cmms/
│   │   │   ├── assets/
│   │   │   ├── pm-schedules/
│   │   │   ├── spare-parts/
│   │   │   └── maintenance-work-orders/
│   │   │
│   │   ├── hr/
│   │   │   ├── employees/
│   │   │   ├── attendance/
│   │   │   ├── leaves/
│   │   │   ├── payroll/
│   │   │   └── employee-documents/
│   │   │
│   │   └── accounts/
│   │       ├── journals/
│   │       ├── banking/
│   │       ├── expenses/
│   │       ├── vendor-bills/
│   │       └── financial-reports/
│   │
│   ├── common/                          # request-pipeline framework primitives (see
│   │   │                                # FAS_ERP_CODING_STANDARDS.md for the common/ vs shared/ split)
│   │   ├── constants/                   # auth.constants.ts, permissions.constants.ts, ...
│   │   ├── exceptions/                  # BusinessException hierarchy
│   │   ├── filters/                     # global exception filter
│   │   ├── interceptors/                # response envelope, entity serialization
│   │   ├── decorators/                  # @Paginate(), @RawResponse()
│   │   ├── utils/                       # getOrgScope()/buildScopedWhere() (org/plant scoping — §7)
│   │   ├── dto/                         # PaginationDto, PaginatedResponseDto
│   │   ├── logger/                      # nestjs-pino wiring
│   │   └── utils/
│   │
│   └── config/                          # env validation (zod/joi), typed config service
│
├── prisma -> ../../packages/database/prisma   # symlink or path reference
├── test/                                 # e2e tests
├── Dockerfile
└── package.json
```

### One module's internal shape (repeat this pattern everywhere)

```
work-orders/
├── work-orders.module.ts
├── work-orders.controller.ts
├── work-orders.service.ts
├── work-orders.repository.ts        # Prisma calls isolated here, not in service
├── dto/
│   ├── create-work-order.dto.ts
│   ├── update-work-order.dto.ts
│   └── query-work-order.dto.ts
├── entities/                        # response shapes (if different from Prisma model)
├── events/                          # work-order.created.event.ts, etc.
└── work-orders.service.spec.ts
```

**Key convention:** Controller → Service → Repository. Service holds business rules (e.g., "can't close a work order with an open QA hold"). Repository is the _only_ place that talks to Prisma. This means when you eventually want to swap ORMs, add caching, or split a module into its own microservice, only the repository layer changes.

**Cross-module communication:** Modules should not directly import another module's repository. Use NestJS's `EventEmitter2` (in-process event bus) — e.g., `production` emits `work-order.completed`, and `inventory` and `dispatch` listen. This is what makes "add a new module later without rewriting old ones" actually true: new listeners can hook into existing events without touching the emitter's code.

---

## 4. Frontend — `apps/ui/` (Next.js App Router)

Route groups map 1:1 to your business modules, which keeps navigation, permissions-per-route, and code-splitting aligned.

```
apps/ui/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── forgot-password/
│   │   ├── (dashboard)/                     # authenticated shell: sidebar + org switcher
│   │   │   ├── layout.tsx
│   │   │   ├── master-data/
│   │   │   │   ├── items/
│   │   │   │   ├── boms/
│   │   │   │   ├── routings/
│   │   │   │   └── ...
│   │   │   ├── sales/
│   │   │   │   ├── leads/
│   │   │   │   ├── quotations/
│   │   │   │   ├── orders/
│   │   │   │   └── invoices/
│   │   │   ├── production/
│   │   │   │   └── work-orders/
│   │   │   │       ├── page.tsx             # list
│   │   │   │       ├── [id]/page.tsx        # detail
│   │   │   │       └── new/page.tsx
│   │   │   ├── inventory/
│   │   │   ├── quality/
│   │   │   ├── dispatch/
│   │   │   ├── cmms/
│   │   │   ├── hr/
│   │   │   ├── accounts/
│   │   │   ├── vault/
│   │   │   ├── audit/
│   │   │   └── admin/                       # org/users/roles/permissions settings
│   │   ├── api/                             # Next.js route handlers ONLY for BFF concerns
│   │   │                                     # (file upload proxy, webhook receivers) —
│   │   │                                     # NOT business logic, that's all in apps/api
│   │   └── layout.tsx
│   │
│   ├── features/                            # feature-sliced logic, mirrors app/ modules
│   │   ├── production/
│   │   │   ├── work-orders/
│   │   │   │   ├── components/              # WorkOrderTable, WorkOrderForm, StatusBadge
│   │   │   │   ├── hooks/                   # useWorkOrders(), useCreateWorkOrder()
│   │   │   │   ├── api.ts                   # calls packages/core api client
│   │   │   │   └── schema.ts                # zod form schema (imports from packages/core if shared)
│   │   │   └── ...
│   │   └── ... (one folder per module, same pattern)
│   │
│   ├── components/                          # truly generic, app-wide (not from ui-kit)
│   ├── lib/                                 # next-auth config, api client instance, query-client
│   ├── stores/                               # zustand stores (ui state: sidebar open, active org)
│   ├── hooks/                                # generic hooks (useDebounce, usePermission)
│   └── middleware.ts                         # route-level auth + permission gating
│
├── public/
├── next.config.js
└── package.json
```

**Why `features/` separate from `app/`:** Next.js App Router folders are _routing_, not code organization. Colocating all business logic (components/hooks/api calls) for "work orders" under `features/production/work-orders/` means the page file in `app/` is a thin composition layer — and this same `features/` folder structure is the pattern you'll mirror in `apps/mobile` later, just swapping the screen-layer.

---

## 5. Mobile — `apps/mobile/` (scaffold now, build later)

```
apps/mobile/
├── app/                    # expo-router screens (mirrors ui's route groups conceptually)
├── src/
│   ├── features/           # same shape as ui's features/, reuses packages/core hooks/api
│   └── components/
├── app.json
└── package.json
```

You don't need to build this now — but registering it in the monorepo from day one (even as an empty Expo scaffold) means `packages/core` gets designed API-agnostic from the start, instead of accidentally growing React-DOM-only assumptions that you'd have to untangle later.

---

## 6. Data Model — designed for extensibility

This is the part that determines whether "add a feature later" is a migration or a rewrite. Four patterns do most of the work:

### 6.1 Every tenant-owned table gets this baseline

```sql
id               integer PRIMARY KEY GENERATED BY DEFAULT AS IDENTITY,
organization_id  integer NOT NULL REFERENCES organizations(id),
custom_fields    jsonb NOT NULL DEFAULT '{}',
created_by       integer REFERENCES users(id),
updated_by       integer REFERENCES users(id),
created_at       timestamptz NOT NULL DEFAULT now(),
updated_at       timestamptz NOT NULL DEFAULT now(),
deleted_at       timestamptz            -- soft delete, never hard-delete business records
```

> **Deviation from an earlier draft of this guide:** primary keys were originally specified as
> `uuid`. The implemented schema (`packages/database/prisma/schema.prisma`) uses
> `Int @id @default(autoincrement())` instead (see migration `20260916110522_switch_pk_to_serial`) —
> simpler joins/indexes for a single-database row-level-multitenancy design where the PK is never
> exposed as a globally-guessable identifier across systems. This doc is corrected to match; don't
> re-introduce uuid PKs to "match the doc" without revisiting that tradeoff first, and don't change
> the schema back to satisfy this doc either — the schema is the source of truth (§ "Doc vs. code" rule
> below).

`custom_fields jsonb` means a client asking for "one extra field on the sales order" next year is a UI change + a JSON key, not a migration. Reserve real columns for fields you _query/filter/join_ on; put "nice to have, rarely queried" fields in `custom_fields`.

### 6.2 Status is a table, not an enum

Instead of `status VARCHAR CHECK (status IN ('draft','approved',...))`, use:

```sql
statuses (id, module VARCHAR, code VARCHAR, label VARCHAR, sort_order INT, is_terminal BOOLEAN, color_token VARCHAR)
-- e.g. module='work_order', code='qa_hold', label='On QA Hold', color_token='warning'
-- color_token is one of the semantic design tokens (see docs/FAS_ERP_DESIGN_SYSTEM.md): success | warning | error | brand | gray
-- lets a status badge render its color FROM DATA, not from a hardcoded if/switch in every component that shows a status
```

and reference `status_id` on the work order. Adding a new status (e.g., a new QA-hold sub-state) becomes a data insert, not a schema change + code deploy. Pair this with a generic `status_history` table (see 6.4) for every module that has a workflow — sales orders, work orders, invoices, maintenance work orders all reuse the _same_ pattern.

### 6.3 Numbering/Sequences as configuration, not hardcoded

```sql
document_sequences (id, organization_id, doc_type VARCHAR, prefix VARCHAR, next_number INT, format VARCHAR)
-- doc_type: 'quotation' | 'sales_order' | 'invoice' | 'work_order' | 'dc' | ...
```

Every module that needs a human-readable running number (QTN-2026-0001, WO-2026-0042) reads/increments from here — new document types just add a row.

### 6.4 Reusable cross-module tables (build once, every module plugs in)

```sql
status_history   (id, org_id, entity_type, entity_id, from_status_id, to_status_id, changed_by, changed_at, remarks)
attachments       (id, org_id, entity_type, entity_id, file_url, file_type, uploaded_by, uploaded_at)
approvals         (id, org_id, entity_type, entity_id, workflow_id, step, approver_id, decision, decided_at)
audit_logs        (id, org_id, actor_id, entity_type, entity_id, action, before jsonb, after jsonb, ip, at)
comments          (id, org_id, entity_type, entity_id, author_id, body, created_at)
```

`entity_type + entity_id` is a **polymorphic reference** (e.g., `entity_type='work_order', entity_id=42`). This is the single highest-leverage design choice for your stated goal — when you add module #11 next year, it gets status history, attachments, approvals, comments, and audit logging _for free_, with zero new tables.

### 6.5 Full table inventory by module

**Platform / Auth**
`organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens` _(unused — see deviation note below)_, `statuses`, `document_sequences`, `audit_logs`, `status_history`, `attachments`, `approvals`, `approval_workflows`, `approval_steps`

> **Deviation:** `refresh_tokens` is modeled here but not used. `platform/auth` stores
> refresh tokens in Redis instead (`refresh:{userId}:{jti}`, set in
> `AuthService.issueTokenPair`/rotated in `refresh`/revoked in `logout` — see
> `apps/api/src/platform/auth/auth.service.ts`), so token revocation is O(1) and
> tokens naturally expire via Redis TTL instead of needing a cleanup job against a
> growing table. This was a deliberate choice made after this table was designed —
> don't "fix" the Prisma model back into use without revisiting that tradeoff first.

**Master Data**
`items`, `item_categories`, `units_of_measure`, `boms`, `bom_versions`, `bom_lines`, `routings`, `routing_versions`, `routing_operations`, `quality_parameters`, `warehouses`, `warehouse_locations`, `chart_of_accounts`, `finance_heads`, `departments`, `designations`, `shifts`, `sales_terms`, `tax_codes`

_(Note `bom_versions` / `routing_versions` — BOMs and routings change over time; a work order must reference the exact version that was active when it was created, or your costing/traceability breaks retroactively when someone edits a BOM.)_

**Sales**
`customers`, `customer_contacts`, `leads`, `quotations`, `quotation_lines`, `sales_orders`, `sales_order_lines`, `invoices`, `invoice_lines`, `delivery_challans`, `dc_lines`, `shipments`

**Production**
`work_orders`, `work_order_lines` (BOM components consumed), `work_order_operations` (routing steps + status), `qa_holds`, `reject_remarks`

**Inventory**
`stock_ledger` (append-only: every receipt/issue/transfer/adjustment — this is your single source of truth; "raw material stock" and "finished goods stock" are _derived views/queries_ over this ledger filtered by item-type and warehouse, not separate tables), `stock_adjustments`, `stock_transfers`

**Quality**
`incoming_inspections`, `incoming_inspection_lines`, `in_process_inspections`, `quality_lots` (accepted/rejected lot tracking, links to `stock_ledger`)

**Dispatch**
`packing_lists`, `packing_list_lines`, `dispatch_records`

**CMMS**
`assets`, `pm_schedules`, `pm_schedule_tasks`, `spare_parts`, `maintenance_work_orders`, `maintenance_work_order_parts`

**HR**
`employees`, `employee_documents` (or just uses generic `attachments`), `attendance_records`, `leave_types`, `leave_requests`, `payroll_runs`, `payslips`, `pf_esi_records`, `overtime_records`, `bonuses`, `loans`, `loan_repayments`

**Accounts**
`journal_entries`, `journal_lines`, `bank_accounts`, `bank_transactions`, `expenses`, `vendor_bills`, `vendor_bill_lines`, `currency_rates` — note: `invoices` lives in Sales but _posts_ a `journal_entry`; don't duplicate the invoice table in Accounts, reference it.

**Vault**
`documents`, `document_folders`, `document_access_grants` (reuses `approvals`/`approval_workflows` from platform)

**Audit**
No new tables — it's a read-only query surface over `audit_logs` + `status_history`, populated by a global `AuditInterceptor` in the NestJS layer that fires on every mutating request.

### 6.6 Relationship spine (how a lead becomes a shipped, invoiced, ledgered job)

```
lead → quotation → sales_order → work_order ──┬─→ work_order_operations (QA holds attach here)
                         │                     ├─→ stock_ledger (consumes BOM components)
                         │                     └─→ quality_lots (accept/reject)
                         │
                         ├─→ invoice → journal_entry (Accounts)
                         └─→ delivery_challan → packing_list → dispatch_record → shipment
```

Every arrow is a foreign key, not a copy of data — e.g., `work_orders.sales_order_id`, `invoices.sales_order_id`, `dispatch_records.delivery_challan_id`. This is what lets "trace this shipment back to the original lead" work as a set of joins instead of a report someone builds by hand.

---

## 7. Multi-Tenancy & RBAC enforcement (concretely)

1. **JWT access-token payload** carries `sub` (userId), `organizationId`, `activePlantId`, `roleId` (see `apps/api/src/platform/auth/types/jwt-payload.types.ts`).
2. **As implemented**, it's not a `TenancyInterceptor` — `TenancyModule` (`apps/api/src/platform/tenancy/tenancy.module.ts`) registers an `nestjs-cls` middleware (runs before any guard, for every request) that verifies the access token and writes `userId`/`organizationId`/`activePlantId`/`roleId`/`correlationId` into `ClsService`'s `AsyncLocalStorage` store. `getOrgScope()`/`buildScopedWhere()` (`apps/api/src/common/utils/org-scope.util.ts`, `FAS_ERP_CODING_STANDARDS.md` §16) read that store from inside a repository method's own body — a repository call site never passes or constructs the scope itself. Repositories/services read tenancy from CLS, **never** from `req.user` — `req.user` (populated later, by `JwtAuthGuard`) is actor identity for things like `audit_logs.actor_id`, not a scoping source, since it's only present on guarded routes and CLS is populated for every request. `getOrgScope()` throws if `organizationId` is missing from CLS rather than silently scoping nothing; `buildScopedWhere()` additionally guarantees a caller-supplied filter can never override the tenant scope on a key collision (scope is merged in last — see §16 for why an earlier decorator-based design that tried to hide the scope argument from callers didn't actually type-check, and was replaced).
3. **Postgres RLS** as defense-in-depth is a planned §8-hardening item, not implemented yet — `ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;` with a policy keyed to a session variable set per-request. Don't claim this exists in a PR/module until it's actually wired.
4. **Permissions**: seed a flat list like `sales.quotation.create`, `production.work_order.approve`, `accounts.journal.post`. `role_permissions` maps roles to these strings. A `@RequirePermission('production.work_order.approve')` decorator (`apps/api/src/platform/auth/decorators/require-permission.decorator.ts`) applies both `JwtAuthGuard` and `PermissionsGuard`; the latter checks the caller's resolved permission set, computed at login/refresh and cached in Redis (`AuthService.cachePermissions`) with a 15-minute fallback TTL. Cache invalidation on a role's permissions changing lands with the `roles-permissions` module (not built yet) — until then, a permission change takes effect for a given user on their next login/refresh or after the cache entry's TTL expires, whichever comes first.
5. **New module later** = add new permission strings + seed them against relevant roles. No schema change to `roles`/`permissions`/`role_permissions`.
6. **Known limitation — login has no explicit tenant selector.** `User` is unique per `(organizationId, email)` (see schema), meaning the same email address is legal in two different organizations. `POST /auth/login` (`LoginDto`) takes only `email`+`password` — there is no org-identifying field, and `AuthRepository.findActiveUserByEmail` matches on email alone (it can't filter by an org it doesn't know yet). If a second organization is ever seeded with a user email that collides with an existing one, login becomes ambiguous (whichever row `findFirst` returns). This is a genuine product/tenant-resolution decision — e.g. subdomain-per-org, an org code/slug field on the login form, or enforcing email uniqueness globally instead of per-org — not an application bug to silently patch. Resolve it deliberately (with lead/product input) before onboarding a second organization with overlapping emails; until then this is dormant with a single-org seed.

---

## 7A. Multi-plant / multi-outlet model

FAS runs one manufacturing plant today. The schema supports N plants per organization from day one — this section is what makes "add plant #2 next year" a data-entry task, not an architecture change.

**Two tenancy levels, not one:**

- `organization_id` — the hard tenant boundary (different companies; data must never cross).
- `plant_id` — an operational scope _within_ an organization (different physical outlets of the same company; data can be consolidated for reporting but day-to-day CRUD/UI is filtered to the plants a user has access to).

**The decision rule for every table, stated once so it never needs re-deciding:**

| Bucket                  | Rule                                                                                                                            | Examples                                                                                                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plant-owned             | Physically happens at / belongs to one location → `plant_id NOT NULL`, scoped like a second tenant key                          | `warehouses`, `stock_ledger`, `work_orders`, `assets` (CMMS), `attendance_records`, `pm_schedules`, `incoming_inspections`                                                            |
| Org-shared catalog      | Exists once for the whole company, referenced by every plant → no `plant_id`                                                    | `items`, `boms`, `customers`, `chart_of_accounts`, `roles`, `routings` (unless a client's plants genuinely run different machinery per routing — cross that bridge only if it's real) |
| Org-owned, plant-tagged | Belongs to the company but should be attributable to a plant for reporting → nullable `plant_id` as a tag, not a scoping filter | `journal_entries` (cost-center-style reporting), `sales_orders` (a `fulfilling_plant_id`), `document_sequences` (some doc types numbered per-plant, some company-wide)                |

**Schema additions (already in `packages/database/prisma/schema.prisma`):**

- `Plant` — belongs to an `Organization`, has `name`/`code`/`address`. `code` feeds into document numbering (`WO-CHN-2026-0001`).
- `UserPlantAccess` — many-to-many `User`↔`Plant` with `isDefault`. Most users belong to one plant; corporate/finance roles can span several. This is intentionally a separate, simple access grant, _not_ folded into the permission system.

**Deliberate simplification — permissions stay org-level.** `production.work_order.approve` is a single permission string, not per-plant (`...@plant:chennai`). Plant-scoping is enforced by `UserPlantAccess` (can this user act in this plant at all) combined with the existing permission check (can this role approve work orders at all), not by multiplying the permission catalog per plant. Revisit only if a real client requirement demands plant-differentiated permissions — don't build it speculatively.

**Enforcement, same pattern as org-scoping (§7):**

1. JWT payload gains `activePlantId` alongside `organizationId`/`userId`/`roleIds`. A user with access to multiple plants switches the active one via a plant switcher in the UI shell (same pattern as an org switcher), which re-issues the token or updates the `ClsService` context.
2. `TenancyInterceptor`/`ClsService` carries both `organizationId` and `activePlantId`; plant-owned-bucket repositories inject `WHERE organization_id = :orgId AND plant_id = :plantId` the same way org-scoping already works.
3. RLS policies extend the same way: a plant-owned table's policy checks both session variables, not just the org one.
4. A consolidated/multi-plant report (e.g., "total stock across all plants") is a query that deliberately omits the `plant_id` filter and aggregates instead — the same tables serve single-plant and cross-plant views without a schema difference.

---

## 8. Step-by-Step Build Roadmap

**Phase 0 — Repo & tooling (days 1–2)**

1. `pnpm init`, set up `pnpm-workspace.yaml` (`apps/*`, `packages/*`), Turborepo (`turbo.json`).
2. Shared configs first: `packages/config` (tsconfig base, eslint, prettier) — every app extends these, so style/type rules are enforced monorepo-wide from commit #1.
3. `docker-compose.yml` for local Postgres + Redis.
4. CI skeleton: GitHub Actions running lint + typecheck + test on every PR (even with empty apps — you want the pipeline shape locked early).

**Phase 1 — Database foundation (days 2–5)** 5. `packages/database`: Prisma schema. Model **Platform + Master Data** tables first (§6.5) — everything else depends on them. 6. Bake in the extensibility baseline (§6.1) as a Prisma "mixin" you copy into every model, plus `statuses`, `status_history`, `attachments`, `approvals`, `audit_logs`, `document_sequences` (§6.2–6.4) — build these _before_ any business module, since every module will depend on them. 7. Write seed scripts: default roles/permissions, a demo organization, UOM list, tax codes.

**Phase 2 — API platform layer (days 5–10)** 8. `apps/api`: bootstrap NestJS, wire Prisma. 9. Build `platform/auth`, `platform/organizations`, `platform/users`, `platform/roles-permissions`, `platform/tenancy` (ClsService + interceptor), `platform/audit` (global interceptor). 10. Get JWT login + permission-guard working end-to-end with a trivial protected route before writing a single business module — this is your foundation, get it right once.

**Phase 3 — Frontend shell (in parallel with Phase 2, days 5–10)** 11. `apps/ui`: Next.js bootstrap, auth pages, dashboard shell/layout, org switcher, `lib/api-client` wired to `packages/api-types` (even if that package is hand-written initially, swap to generated later). 12. Route-level permission gating in `middleware.ts`.

**Phase 4 — Master Data module (days 10–15)** 13. Build `modules/master-data/*` fully on both api and ui — items, UOM, BOMs (with versioning), routings, warehouses, chart of accounts, HR structures, sales terms, quality parameters. **Nothing else can be built correctly until this exists**, since every other module references it.

**Phase 5 — Core operational spine (weeks 3–6)** 14. Build in dependency order, since each feeds the next: **Sales → Production → Inventory → Quality → Dispatch**. This order matches your actual business flow (§ in your prompt) and means each module's "happy path" tests can use real data created by the previous module instead of fixtures. 15. Wire cross-module events as you go (`work-order.completed` → inventory listens, dispatch listens) rather than direct calls.

**Phase 6 — Supporting modules (weeks 6–9, can parallelize across devs)** 16. CMMS, HR, Accounts can be built in parallel by different team members once the spine (Phase 5) is stable, since they're less interdependent with each other. Accounts needs Sales' invoice events; CMMS needs nothing but Master Data; HR is nearly standalone.

**Phase 7 — Governance layer (week 9)** 17. Vault (documents + approvals — reuse `platform/documents-vault` and the generic `approvals` tables). Audit UI (read-only views over `audit_logs`/`status_history` — should need almost no new backend work if §6.4 was built correctly).

**Phase 8 — Hardening (week 10+)** 18. RLS policies on every tenant table, rate limiting, e2e test suite covering the lead→ledger spine, load testing on `stock_ledger` (highest write volume), CI/CD to staging/prod, seed a UAT org for the client.

**Ongoing** 19. Every new module going forward = a folder in `modules/`, a slice in `features/`, tables following the §6.1–6.4 baseline, and permission strings — no changes to `organizations`, `users`, `roles`, `audit_logs`, or the tenancy layer required. That's the test of whether the architecture held.

---

## 9. A few hard-won rules worth stating explicitly

- **Never delete business records.** Soft-delete (`deleted_at`) everywhere. An ERP's job is traceability; a hard-deleted work order breaks every report that joined through it.
- **`stock_ledger` is append-only.** Never `UPDATE` a stock quantity — insert a new movement row. Current stock is `SUM(quantity_delta)`. This is what makes stock reports, audits, and "what did we have on hand on March 3rd" all answerable.
- **BOM/Routing versioning is not optional.** The moment someone edits a BOM after work orders already reference it, un-versioned data silently corrupts historical costing.
- **One migration tool, one direction.** All schema changes go through Prisma Migrate, committed to `packages/database/prisma/migrations`, never hand-edited in prod.
- **Don't build microservices to feel "production level."** A modular monolith with clean module/event boundaries, deployed as one container (or two: api + ui), is the correct production architecture for a 5-person team. You can extract a service later _because_ the module boundaries were clean — that optionality is what this structure buys you, not premature distribution.

---

## 10. Deployment structure (adopted from your Hireling repo convention)

Hireling's pattern splits deployment into two layers, and it's worth keeping exactly this split for FAS ERP:

- **Root `deployment/`** — CI _plumbing_: the CodeBuild project + IAM role definitions, one subfolder per app. This rarely changes once set up.
- **Each app's own `deployment/<app-name>/<env>/`** — the _environment-specific_ stack (what actually gets deployed to dev/uat/prod). This changes often as infra evolves.

Applied to FAS ERP:

```
fas-erp/
├── deployment/                              # CI plumbing only, mirrors Hireling's root deployment/
│   ├── api/codebuild/{project,role}/template.yaml
│   ├── ui/codebuild/{project,role}/template.yaml
│   └── mobile/codebuild/{project,role}/template.yaml   # add once mobile ships
│
├── apps/
│   ├── api/
│   │   ├── deployment/fas-erp/{dev,uat,prod}/template.yaml
│   │   ├── Dockerfile
│   │   └── ...
│   ├── ui/
│   │   ├── deployment/fas-erp/{dev,uat,prod}/template.yaml
│   │   └── ...
│   └── mobile/
│       └── ...                              # EAS build profiles instead of CFN, once it exists
│
├── .husky/                                  # root-level git hooks, same as Hireling
└── package.json                              # root: husky + turbo scripts only, not a shared app
```

This maps directly onto the monorepo shape from §2 — `deployment/` and `.husky/` are the only things that sit at repo root alongside tooling configs; no shared app code lives at root, matching Hireling's rule.

**Two more conventions worth carrying over directly, since they held up in production for Hireling:**

- **Testing split, mirrored in `apps/api/test/`:** unit `.spec.ts` files colocated next to each `controller.ts`/`service.ts` (already in §3's module shape), plus a separate `test/` folder for **e2e + API-contract tests** (Dredd against an OpenAPI spec, or Nest's own e2e harness). For an ERP, contract tests matter more than usual — `ui`, and later `mobile`, both depend on the API shape staying stable, and a contract test catches a breaking DTO change before it ships.
- **Component split in `ui/components/`:** one folder per primitive (`components/<primitive>/index.tsx` — button, input, select, modal, drawer), and a separate `components/widgets/` for compositions that know about your domain (e.g., a `WorkOrderStatusBadge` that reads from `statuses`). Keep this distinction strict: if a component imports a hook that calls the API or knows about a business entity, it's a widget, not a primitive — primitives go in `packages/ui-kit` (shared with future mobile-adjacent web surfaces), widgets stay inside `apps/ui/src/features/<module>/components/` since they're module-specific.

---

## 11. Getting started — Phase 0 in detail

Do these in order; each one only takes a partial day, but they set the shape everything else inherits.

1. **Init the workspace.** `pnpm init`, add `pnpm-workspace.yaml` listing `apps/*` and `packages/*`, add `turbo.json` with the standard pipeline (`build`, `dev`, `lint`, `test`, `typecheck`), each depending on its workspace deps' `build` first.
2. **`.husky/` at root** — pre-commit: lint-staged (eslint + prettier), commit-msg: commitlint (conventional commits — this matters once you have 5 people committing to one repo).
3. **`packages/config`** — shared `tsconfig.base.json`, root `.eslintrc`, `prettier.config.js`. Every app's own config extends these; don't let each app grow its own rules.
4. **`docker-compose.yml`** at root — Postgres 16 + Redis, so every dev runs the same local stack.
5. **`deployment/` root + one CI workflow** (`.github/workflows/ci.yml`) that runs `turbo lint typecheck test` on every PR — even against empty `apps/api`/`apps/ui` shells, so the pipeline shape is locked before real code lands.
6. **Bootstrap the three apps as empty shells**: `nest new apps/api`, `npx create-next-app apps/ui`, `npx create-expo-app apps/mobile` (mobile can stay untouched after this for months — it just needs to exist so `packages/core` is never written mobile-blind).
7. **`packages/database`** — `prisma init` here, not inside `apps/api`; `apps/api` imports the generated client as a workspace package.

Everything in this list is mechanical and safe to hand to an agent in one shot — see the prompt below.

---

## 12. What comes right after the scaffold (Phase 1 preview)

Once the base repo exists, the next two things need to land together, because auth can't be tested without at least one real table and the schema's baseline conventions (§6.1–6.4) need to exist before _any_ business table is written:

1. **Prisma schema, platform layer only:** `organizations`, `users`, `roles`, `permissions`, `role_permissions`, `user_roles`, `refresh_tokens` (modeled but unused — see §6.5's deviation note, refresh tokens actually live in Redis), `statuses`, `document_sequences`, `audit_logs`, `status_history`, `attachments`, `approvals`, `approval_workflows`, `approval_steps` — plus the `custom_fields`/soft-delete/audit-column baseline (§6.1) applied everywhere. First migration, first seed script (a demo org + a Super Admin role with every permission).
2. **Auth module end-to-end:** `platform/auth` (signup, login, refresh, password reset) on the API, wired to bcrypt/argon2 password hashing, JWT access+refresh, and `platform/tenancy`'s `ClsService`. On the UI: `(unauthenticated)` route group with login/signup/forgot-password pages, `(authenticated)` shell behind `middleware.ts`.
3. **RBAC skeleton:** seed `roles`/`permissions` tables, build the `PermissionsGuard` + `@RequirePermission()` decorator, and prove it works on one dummy protected route before building a single business module on top of it.

This is exactly the order I'll walk you through next — say the word and we'll go module-by-module starting with the Prisma schema for the platform layer and the auth flow.
