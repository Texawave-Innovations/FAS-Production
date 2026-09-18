// apps/ui/src/lib/query-client.tsx
// TanStack Query provider — the server-cache half of the stack decision in
// FAS_ERP_Architecture_Guide.md §1 ("TanStack Query (server cache) + Zustand
// (light client/UI state)"). See FAS_ERP_CODING_STANDARDS.md's "Frontend
// data fetching" section for the query-key convention every feature's hooks
// must follow (organization/plant-aware keys) and the logout/org-switch
// cache-clearing rule this provider's client is cleared by.
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

// One instance per browser session (App Router client components re-render
// on navigation, but this component itself only mounts once at the root —
// useState's initializer runs once, same pattern TanStack Query's own Next.js
// docs recommend instead of a module-level singleton, which would leak
// across requests if this ever ran on the server).
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // ERP working screens re-fetch on an explicit action (save,
            // filter change) more often than they need window-focus
            // refetches firing mid-form-entry — see CODING_STANDARDS.md.
            refetchOnWindowFocus: false,
            staleTime: 30_000,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
