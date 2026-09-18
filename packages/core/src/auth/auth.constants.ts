// packages/core/src/auth/auth.constants.ts
// Endpoint paths used by this module's own auth-client.ts — colocated here
// per module rather than scattered as inline string literals in the client.
export const AUTH_ENDPOINTS = {
  LOGIN: "/auth/login",
  REFRESH: "/auth/refresh",
  LOGOUT: "/auth/logout",
  ME: "/auth/me",
} as const;
