// apps/ui/src/lib/token-store.ts
// The access token lives in memory only (never localStorage/sessionStorage,
// per the login task's threat model — an in-memory token can't be read by a
// second tab's XSS payload the way storage-backed tokens can). Losing it on
// a hard refresh is expected and handled by AuthProvider's silent-refresh-
// on-mount flow, backed by the httpOnly refresh cookie.
let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  accessToken = token;
}
