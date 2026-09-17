// apps/ui/src/features/auth/auth-context.tsx
"use client";

import { ApiError, type AuthUser } from "@fas-erp/core";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authClient } from "../../lib/api-client";
import { setAccessToken } from "../../lib/token-store";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);

  // On first load there's no access token in memory (a page refresh clears
  // it), but a valid httpOnly refresh cookie may still be sitting in the
  // browser — try to silently exchange it for a session before falling back
  // to the login page.
  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { accessToken } = await authClient.refresh();
        setAccessToken(accessToken);
        const profile = await authClient.me();
        if (!cancelled) {
          setUser(profile);
          setStatus("authenticated");
        }
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setStatus("unauthenticated");
        }
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authClient.login(email, password);
    setAccessToken(result.accessToken);
    setUser(result.user);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(() => ({ status, user, login, logout }), [status, user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export { ApiError };
