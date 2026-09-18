import { ClsServiceManager } from "nestjs-cls";
import type { AppClsStore } from "../../platform/tenancy/tenancy.types.js";
import { OrgScoped, type OrgScope } from "./org-scoped.decorator.js";

class FakeRepository {
  // The decorator prepends scope as the first argument the *caller* never
  // passes — callers only ever supply whatever comes after it (here, `filter`).
  @OrgScoped()
  findMany(scope: OrgScope, filter: string) {
    return { scope, filter };
  }

  @OrgScoped({ plantScoped: true })
  findManyPlantScoped(scope: OrgScope) {
    return scope;
  }
}

function runWithCls<T>(store: Partial<AppClsStore>, fn: () => T): T {
  const cls = ClsServiceManager.getClsService<AppClsStore>();
  return cls.runWith(store as AppClsStore, fn);
}

describe("@OrgScoped()", () => {
  it("prepends the org scope from CLS as the method's first argument", () => {
    const repo = new FakeRepository();
    // Callers never pass the scope themselves — this call site's only real
    // argument is the filter; the decorator injects scope ahead of it.
    const result = runWithCls({ organizationId: 7 }, () =>
      (repo.findMany as unknown as (filter: string) => { scope: OrgScope; filter: string })(
        "active-only",
      ),
    );

    expect(result).toEqual({ scope: { organizationId: 7 }, filter: "active-only" });
  });

  it("adds plantId only when plantScoped and an active plant is set", () => {
    const repo = new FakeRepository();

    const withPlant = runWithCls({ organizationId: 7, activePlantId: 3 }, () =>
      (repo.findManyPlantScoped as unknown as () => OrgScope)(),
    );
    expect(withPlant).toEqual({ organizationId: 7, plantId: 3 });

    const withoutPlant = runWithCls({ organizationId: 7, activePlantId: null }, () =>
      (repo.findManyPlantScoped as unknown as () => OrgScope)(),
    );
    expect(withoutPlant).toEqual({ organizationId: 7 });
  });

  it("throws when there is no organizationId in context", () => {
    const repo = new FakeRepository();
    expect(() =>
      runWithCls({}, () =>
        (repo.findMany as unknown as (filter: string) => unknown)("active-only"),
      ),
    ).toThrow(/no organizationId/);
  });
});
