// apps/api/src/common/constants/auth.constants.ts
// Moved from platform/auth/auth.constants.ts — cross-cutting wiring
// constants (cookie name/path, cache keys, metadata key) belong in
// common/constants per CODING_STANDARDS.md, not scattered as bare
// `export const`s inside the module that happens to use them first.
export const AUTH_CONSTANTS = {
  REFRESH_COOKIE_NAME: "refresh_token",
  REFRESH_COOKIE_PATH: "/auth",
  PERMISSION_METADATA_KEY: "fas:required-permission",
  PERMISSIONS_CACHE_PREFIX: "permissions",
  PERMISSIONS_CACHE_TTL_SECONDS: 900, // 15 min fallback TTL on a cache miss
  REFRESH_TOKEN_KEY_PREFIX: "refresh",
} as const;
