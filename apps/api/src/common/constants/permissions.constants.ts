// apps/api/src/common/constants/permissions.constants.ts
// Re-exports the canonical catalog from packages/core — apps/api,
// packages/database's seed script, and (eventually) apps/ui all need the
// same permission-code strings, so the source of truth lives in
// packages/core/src/constants/permissions.constants.ts (see
// CODING_STANDARDS.md's "Constants" section for why). This file exists so
// apps/api code importing "common/constants" doesn't need to know that.
export { PERMISSIONS } from "@fas-erp/core";
