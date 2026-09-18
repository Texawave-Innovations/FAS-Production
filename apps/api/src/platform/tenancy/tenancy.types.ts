// apps/api/src/platform/tenancy/tenancy.types.ts
import type { ClsStore } from "nestjs-cls";

// The tenancy context populated by TenancyModule's CLS middleware (from the
// access token, before any guard runs) and read by repositories/services
// throughout the app for org/plant scoping. See tenancy.module.ts for why
// this is the source of truth instead of req.user.
export interface AppClsStore extends ClsStore {
  userId?: number;
  organizationId?: number;
  activePlantId?: number | null;
  roleId?: number | null;
  // Set before anything else in this middleware's setup — see
  // common/utils/correlation-id.util.ts and AllExceptionsFilter, which both
  // read/write the same value off the request rather than assuming CLS is
  // populated first.
  correlationId?: string;
}
