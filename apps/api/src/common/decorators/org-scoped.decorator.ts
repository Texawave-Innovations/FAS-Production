// apps/api/src/common/decorators/org-scoped.decorator.ts
// See CODING_STANDARDS.md for the full usage pattern + before/after example.
//
// Can't be a createParamDecorator: that API only resolves inside Nest's HTTP
// execution context (controller handlers behind guards/interceptors), but
// repositories are called as plain methods from services — there's no
// ExecutionContext to read at that point. This is instead a *method*
// decorator for repository methods: it wraps the target so its first
// argument is always the current request's org/plant scope, read via
// nestjs-cls's documented escape hatch for reading CLS outside DI
// (ClsServiceManager.getClsService()). A repository method built this way
// cannot forget the WHERE clause — it never constructs the scope itself.
import { ClsServiceManager } from "nestjs-cls";
import type { AppClsStore } from "../../platform/tenancy/tenancy.types.js";

export interface OrgScope {
  organizationId: number;
  plantId?: number;
}

export interface OrgScopedOptions {
  // Set for plant-owned-bucket tables (see ARCHITECTURE.md §7A) — adds
  // plantId to the scope when the requesting user has an active plant.
  // Leave unset for org-shared-catalog tables, which scope by org only.
  plantScoped?: boolean;
}

export function OrgScoped(options: OrgScopedOptions = {}): MethodDecorator {
  return function (_target: object, _propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    const original = descriptor.value as (...args: unknown[]) => unknown;
    descriptor.value = function (this: unknown, ...args: unknown[]) {
      const cls = ClsServiceManager.getClsService<AppClsStore>();
      const organizationId = cls.get("organizationId");
      if (organizationId == null) {
        throw new Error(
          "@OrgScoped(): no organizationId in the current request context — this method must be called within a request that has passed through TenancyModule's CLS middleware.",
        );
      }

      const scope: OrgScope = { organizationId };
      if (options.plantScoped) {
        const activePlantId = cls.get("activePlantId");
        if (activePlantId != null) {
          scope.plantId = activePlantId;
        }
      }

      return original.apply(this, [scope, ...args]);
    };
    return descriptor;
  };
}
