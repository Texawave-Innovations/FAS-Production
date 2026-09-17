// packages/core/src/auth/auth-client.ts
import type { ApiClient } from "../api/client.js";
import type { AuthUser, LoginResult, RefreshResult } from "./types.js";

export interface AuthClient {
  login(email: string, password: string): Promise<LoginResult>;
  refresh(): Promise<RefreshResult>;
  logout(): Promise<void>;
  me(): Promise<AuthUser>;
}

export function createAuthClient(apiClient: ApiClient): AuthClient {
  return {
    login(email, password) {
      return apiClient.request<LoginResult>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    refresh() {
      return apiClient.request<RefreshResult>("/auth/refresh", { method: "POST" });
    },
    async logout() {
      await apiClient.request<{ success: boolean }>("/auth/logout", { method: "POST" });
    },
    me() {
      return apiClient.request<AuthUser>("/auth/me");
    },
  };
}
