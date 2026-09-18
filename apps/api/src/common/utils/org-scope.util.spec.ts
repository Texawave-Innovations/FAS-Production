import { ClsServiceManager } from "nestjs-cls";
import { describe, expect, it } from "vitest";
import type { AppClsStore } from "../../platform/tenancy/tenancy.types.js";
import { buildScopedWhere, getOrgScope } from "./org-scope.util.js";

function runWithCls<T>(store: Partial<AppClsStore>, fn: () => T): T {
  const cls = ClsServiceManager.getClsService<AppClsStore>();
  return cls.runWith(store as AppClsStore, fn);
}

describe("getOrgScope()", () => {
  it("reads organizationId from the current CLS context", () => {
    const scope = runWithCls({ organizationId: 7 }, () => getOrgScope());
    expect(scope).toEqual({ organizationId: 7 });
  });

  it("adds plantId only when plantScoped and an active plant is set", () => {
    const withPlant = runWithCls({ organizationId: 7, activePlantId: 3 }, () =>
      getOrgScope({ plantScoped: true }),
    );
    expect(withPlant).toEqual({ organizationId: 7, plantId: 3 });

    const withoutPlant = runWithCls({ organizationId: 7, activePlantId: null }, () =>
      getOrgScope({ plantScoped: true }),
    );
    expect(withoutPlant).toEqual({ organizationId: 7 });
  });

  it("ignores activePlantId when plantScoped is not set", () => {
    const scope = runWithCls({ organizationId: 7, activePlantId: 3 }, () => getOrgScope());
    expect(scope).toEqual({ organizationId: 7 });
  });

  it("throws when there is no organizationId in context", () => {
    expect(() => runWithCls({}, () => getOrgScope())).toThrow(/no organizationId/);
  });
});

describe("buildScopedWhere()", () => {
  it("merges a filter with the org scope", () => {
    const where = runWithCls({ organizationId: 7 }, () =>
      buildScopedWhere<{ status: string }>({ status: "active" }),
    );
    expect(where).toEqual({ status: "active", organizationId: 7 });
  });

  it("the tenant scope always wins — a filter can never override organizationId/plantId", () => {
    // Even if a filter object is (illegitimately) constructed with its own
    // organizationId/plantId — e.g. from an un-narrowed caller input — the
    // real scope from CLS overwrites it, because scope is spread *after*
    // the filter. This is the structural fix for "scope merges that let a
    // caller-provided filter override org/plant scope."
    const maliciousFilter = {
      organizationId: 999,
      plantId: 999,
      status: "active",
    } as unknown as Omit<{ status: string }, "organizationId" | "plantId">;
    const where = runWithCls({ organizationId: 7, activePlantId: 3 }, () =>
      buildScopedWhere(maliciousFilter, { plantScoped: true }),
    );
    expect(where).toEqual({ organizationId: 7, plantId: 3, status: "active" });
  });

  it("works with no filter at all", () => {
    const where = runWithCls({ organizationId: 7 }, () => buildScopedWhere(undefined));
    expect(where).toEqual({ organizationId: 7 });
  });
});
