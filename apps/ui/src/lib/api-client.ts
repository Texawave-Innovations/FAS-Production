// apps/ui/src/lib/api-client.ts
// Wires packages/core's framework-agnostic client to this app's specifics:
// where the API lives (env) and where the access token lives (token-store).
// A 401 triggers exactly one silent-refresh attempt before giving up — see
// createApiClient's onUnauthorized in packages/core.
import { createApiClient, createAuthClient } from "@fas-erp/core";
import { API_CONFIG } from "../constants/api-endpoints";
import { getAccessToken, setAccessToken } from "./token-store";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? API_CONFIG.DEFAULT_BASE_URL;

export const apiClient = createApiClient({
  baseUrl,
  getAccessToken,
  onUnauthorized: async () => {
    try {
      const { accessToken } = await authClient.refresh();
      setAccessToken(accessToken);
      return accessToken;
    } catch {
      setAccessToken(null);
      return null;
    }
  },
});

export const authClient = createAuthClient(apiClient);
