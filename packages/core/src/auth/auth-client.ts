// packages/core/src/auth/auth-client.ts
import type { ApiClient } from "../api/client.js";
import { AUTH_ENDPOINTS } from "./auth.constants.js";
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
      return apiClient.request<LoginResult>(AUTH_ENDPOINTS.LOGIN, {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
    },
    refresh() {
      return apiClient.request<RefreshResult>(AUTH_ENDPOINTS.REFRESH, { method: "POST" });
    },
    async logout() {
      await apiClient.request<{ success: boolean }>(AUTH_ENDPOINTS.LOGOUT, { method: "POST" });
    },
    me() {
      return apiClient.request<AuthUser>(AUTH_ENDPOINTS.ME);
    },
  };
}
