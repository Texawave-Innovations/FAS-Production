// apps/ui/src/features/auth/hooks/use-permission-check.ts
// Reference query hook: demonstrates the pattern every feature's data-fetching
// hooks should follow (FAS_ERP_CODING_STANDARDS.md's "Frontend data fetching"
// section) — org/plant-aware query key, typed response, error surfaced
// through the same ApiError every non-query call site uses. Backed by the
// real GET /auth/permission-check route (auth.controller.ts), which exists
// specifically to prove PermissionsGuard end-to-end — this hook is the
// frontend half of that same proof.
"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { useAuth } from "../auth-context";

interface PermissionCheckResult {
  ok: boolean;
  userId: number;
  roleId: number | null;
}

export function usePermissionCheck(): UseQueryResult<PermissionCheckResult, unknown> {
  const { user, status } = useAuth();

  return useQuery({
    // Keyed by org + plant, not just a bare string — two users in different
    // organizations (or the same user after switching plants, once that
    // exists) must never share this cache entry.
    queryKey: ["auth", "permission-check", user?.organizationId, user?.activePlantId],
    queryFn: () => apiClient.request<PermissionCheckResult>("/auth/permission-check"),
    enabled: status === "authenticated",
  });
}
