// apps/api/src/common/utils/org-scope.util.ts
//
// Replaces an earlier `@OrgScoped()` method-decorator design (see git
// history / FAS_ERP_CODING_STANDARDS.md's revision notes if you're looking
// for it) that turned out not to work: TypeScript's decorator types do not
// let a decorator change the externally-visible parameter list of the
// method it decorates — `tsc` rejects a caller invoking the method with
// fewer arguments than the *undecorated* signature declares, no matter what
// the decorator does at runtime (confirmed directly: TS1270 "Decorator
// function return type ... is not assignable to type ...' when the
// decorator's replacement function has a different parameter list, and a
// caller omitting the injected argument still gets a TS2554 "Expected N
// arguments" error). The only way to make the earlier pattern's documented
// caller-side usage — `this.repository.findMany(filter)`, no scope argument
// — actually type-check was an `as unknown as (...)` cast at every real
// call site, which is worse than no protection at all: a silently-unsafe
// cast is easy to copy-paste wrong and easy to stop noticing in review.
//
// This plain function has no such problem: a repository method calls
// `getOrgScope()` in its own body and builds its own `where` clause. There
// is no hidden argument for the type system to fight, so ordinary
// TypeScript checks the call site normally.
import { ClsServiceManager } from "nestjs-cls";
import type { AppClsStore } from "../../platform/tenancy/tenancy.types.js";

export interface OrgScope {
  organizationId: number;
  plantId?: number;
}

export interface OrgScopeOptions {
  // Set for plant-owned-bucket tables (see FAS_ERP_Architecture_Guide.md
  // §7A) — adds plantId to the scope when the requesting user has an active
  // plant. Leave unset for org-shared-catalog tables, which scope by org only.
  plantScoped?: boolean;
}

/**
 * Reads the current request's tenant scope from CLS. Every repository
 * method that reads/writes tenant data must call this and use its result —
 * never construct `{ organizationId }` by hand, and never read
 * `organizationId`/`activePlantId` off `req.user` (see tenancy.module.ts's
 * file comment for why req.user is actor identity, not a scoping source).
 *
 * Throws if there is no organizationId in the current CLS context — this
 * must only be called from within a request that has passed through
 * TenancyModule's CLS middleware.
 *
 * **Merge order matters**: when building a Prisma `where` clause, spread
 * this scope's result *after* any caller-supplied filter
 * (`{ ...filter, ...getOrgScope() }`), never before. A filter object that
 * happens to contain an `organizationId`/`plantId` key must never be able
 * to win against the tenant scope — see this file's own
 * `buildScopedWhere()` helper below, which enforces that order structurally
 * instead of relying on every call site to remember it.
 */
export function getOrgScope(options: OrgScopeOptions = {}): OrgScope {
  const cls = ClsServiceManager.getClsService<AppClsStore>();
  const organizationId = cls.get("organizationId");
  if (organizationId == null) {
    throw new Error(
      "getOrgScope(): no organizationId in the current request context — this must be called from within a request that has passed through TenancyModule's CLS middleware.",
    );
  }

  const scope: OrgScope = { organizationId };
  if (options.plantScoped) {
    const activePlantId = cls.get("activePlantId");
    if (activePlantId != null) {
      scope.plantId = activePlantId;
    }
  }
  return scope;
}

/**
 * Merges a caller-supplied filter with the current org scope for a Prisma
 * `where` clause, with the scope always winning on a key collision — the
 * structural fix for "a filter containing organizationId/plantId could
 * override the tenant scope." Strips organizationId/plantId out of the
 * filter's own type at the type level (via Omit) so a caller can't even
 * pass them, as well as at runtime (spread order).
 */
export function buildScopedWhere<F extends Record<string, unknown>>(
  filter: Omit<F, "organizationId" | "plantId"> | undefined,
  options: OrgScopeOptions = {},
): OrgScope & Omit<F, "organizationId" | "plantId"> {
  return { ...(filter ?? {}), ...getOrgScope(options) } as OrgScope &
    Omit<F, "organizationId" | "plantId">;
}
