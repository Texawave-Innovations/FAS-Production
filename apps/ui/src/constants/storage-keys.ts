// apps/ui/src/constants/storage-keys.ts
// No client-side storage (localStorage/sessionStorage) is in use today — the
// access token is deliberately kept in memory only (see lib/token-store.ts's
// threat-model comment) and nothing else needs persisting yet. Kept as an
// empty, documented placeholder rather than inventing unused keys; add real
// entries here if/when something genuinely needs client storage.
export const STORAGE_KEYS = {} as const;
