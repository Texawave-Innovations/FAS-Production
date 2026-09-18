// packages/core/src/constants/permissions.constants.ts
// Canonical permission-code catalog. Needed on both sides of the API
// boundary — apps/api's guards check against these strings, packages/database's
// seed script inserts them, and apps/ui will gate UI elements by them — so it
// lives here once instead of being hand-copied into each consumer. See
// CODING_STANDARDS.md's "Constants" section for the placement rule.
export const PERMISSIONS = {
  PLATFORM_USER_MANAGE: "platform.user.manage",
  PLATFORM_ROLE_MANAGE: "platform.role.manage",
  PLATFORM_PLANT_MANAGE: "platform.plant.manage",
  PLATFORM_AUDIT_VIEW: "platform.audit.view",
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
