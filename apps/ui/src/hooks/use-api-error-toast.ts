// apps/ui/src/hooks/use-api-error-toast.ts
// The reusable hook every module's forms should call on a failed mutation —
// see docs/FAS_ERP_CODING_STANDARDS.md's "UI error handling" section.
"use client";

import { useCallback } from "react";
import { useToast } from "../components/Toast";
import { getApiErrorMessage } from "../lib/api-error";

export function useApiErrorToast(): (error: unknown) => void {
  const toast = useToast();
  return useCallback((error: unknown) => toast.error(getApiErrorMessage(error)), [toast]);
}
