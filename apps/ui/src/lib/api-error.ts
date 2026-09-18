// apps/ui/src/lib/api-error.ts
// Single mapping from the consistent API error shape (ApiError, thrown by
// packages/core/src/api/client.ts for every non-2xx response — see
// docs/FAS_ERP_CODING_STANDARDS.md §13's AllExceptionsFilter shape) to a
// user-facing string. Every module's forms should go through this (or the
// useApiErrorToast hook built on it) instead of hand-rolling their own
// `err instanceof ApiError ? err.message : "..."` per call site.
import { ApiError } from "@fas-erp/core";

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function getApiErrorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : FALLBACK_MESSAGE;
}
