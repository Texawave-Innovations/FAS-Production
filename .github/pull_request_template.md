<!-- Checklist mirrors docs/FAS_ERP_CODING_STANDARDS.md §9. Keep the two in sync if the standard changes. -->

## PR review checklist

- [ ] Controller has no business logic; Service has no direct Prisma calls; Repository is the only Prisma consumer.
- [ ] New DTOs are operation-specific (create/update/query), not a shared bloated DTO.
- [ ] Any logic that could be needed by `ui` _and_ `mobile` is in `packages/core`, not duplicated.
- [ ] No new hardcoded status/enum — uses the `statuses` table if this is a workflow state.
- [ ] Cross-module effects go through `EventEmitter2`, not a direct import of another module's service/repository.
- [ ] New table follows the baseline (§6.1 of the architecture guide): `organization_id`, `custom_fields`, `created_by/updated_by`, `created_at/updated_at`, `deleted_at`.
- [ ] Tests added for business rules, not just CRUD.
- [ ] Checked `packages/core`, `apps/api/src/shared`, and `packages/ui-kit` before writing new shared-shaped code.
- [ ] No hardcoded hex/px colors or font sizes — uses tokens from `packages/ui-kit/src/theme.css` (see `docs/FAS_ERP_DESIGN_SYSTEM.md`), including a `dark:` pair for every color utility.
- [ ] Repository methods that read/write tenant data use `getOrgScope()`/`buildScopedWhere()` (§16), not a hand-rolled `organizationId` filter.
- [ ] New business rule throws a `BusinessException` subclass (§13), not a raw `HttpException`.
- [ ] No magic strings for permission codes, cookie/cache keys, or routes — a `const` object in `common/constants`, `packages/core/src/constants`, or `apps/ui/src/constants` (§10).
- [ ] List endpoints return a `PaginatedResponseDto` via `@Paginate()` (§15), not hand-parsed `page`/`limit` query params.
