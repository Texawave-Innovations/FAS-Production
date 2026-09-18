// packages/core/src/auth/types.ts
// Wire shapes now live in packages/api-types (the API↔UI boundary source of
// truth — see CODING_STANDARDS.md's type-convention section). Re-exported
// here so existing imports of `@fas-erp/core`'s AuthUser/LoginResult/
// RefreshResult keep working unchanged.
export type { AuthUser, LoginResult, RefreshResult } from "@fas-erp/api-types";
