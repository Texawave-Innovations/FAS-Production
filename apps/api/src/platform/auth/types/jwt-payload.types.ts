// apps/api/src/platform/auth/types/jwt-payload.types.ts

// Signed with JWT_ACCESS_SECRET, 15 min TTL. `sub` is the user id. A user
// with no role/plant assigned yet can still authenticate, hence the nulls —
// PermissionsGuard rejects on a null roleId when a permission is required.
export interface AccessTokenPayload {
  sub: number;
  organizationId: number;
  activePlantId: number | null;
  roleId: number | null;
}

// Signed with JWT_REFRESH_SECRET, 7 day TTL. Deliberately minimal — org/plant/
// role are re-resolved from the DB on refresh so a role or plant change takes
// effect on the next refresh instead of surviving in a stale token for days.
// `jti` is the Redis rotation key: refresh:{sub}:{jti}.
export interface RefreshTokenPayload {
  sub: number;
  jti: string;
}
