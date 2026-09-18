// apps/ui/src/constants/api-endpoints.ts
// Per-path endpoint constants (e.g. "/auth/login") live in
// packages/core/src/auth/auth.constants.ts, next to the client code
// (auth-client.ts) that actually calls them — apps/ui doesn't make direct
// fetch() calls to apps/api today, it goes through @fas-erp/core's clients.
// This file holds the one API-wiring constant apps/ui does own: where the
// API is, for lib/api-client.ts to fall back to outside NEXT_PUBLIC_API_URL.
export const API_CONFIG = {
  DEFAULT_BASE_URL: "http://localhost:3001",
} as const;
