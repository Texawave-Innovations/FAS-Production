// packages/core/src/api/client.ts
// Framework-agnostic fetch wrapper shared by apps/ui and (later) apps/mobile.
// Knows nothing about React or Next.js — the app wires in where the access
// token lives and what "no longer authenticated" should do.
export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | undefined;
  // Called at most once per request when the server responds 401 (and the
  // request itself wasn't the refresh call) — lets the caller attempt a
  // silent refresh and hand back a new access token to retry with. Return
  // null/undefined to give up and let the 401 propagate as an ApiError.
  onUnauthorized?: () => Promise<string | null | undefined>;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  async function send(
    path: string,
    init: RequestInit,
    token: string | null | undefined,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    if (!headers.has("Content-Type") && init.body) {
      headers.set("Content-Type", "application/json");
    }
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return fetch(`${config.baseUrl}${path}`, {
      ...init,
      headers,
      // Sends/receives the httpOnly refresh cookie set by POST /auth/login
      // and /auth/refresh — required since api and ui run on different
      // origins in dev.
      credentials: "include",
    });
  }

  async function parseBody(res: Response): Promise<unknown> {
    if (res.status === HttpStatusNoContent) return undefined;
    const contentType = res.headers.get("content-type");
    if (!contentType?.includes("application/json")) return undefined;
    return res.json();
  }

  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = config.getAccessToken?.();
    let res = await send(path, init, token);

    if (
      res.status === HttpStatusUnauthorized &&
      !AUTH_ENDPOINTS_EXEMPT_FROM_RETRY.has(path) &&
      config.onUnauthorized
    ) {
      const newToken = await config.onUnauthorized();
      if (newToken) {
        res = await send(path, init, newToken);
      }
    }

    const body = await parseBody(res);
    if (!res.ok) {
      const message = isErrorBody(body) ? body.message : res.statusText;
      throw new ApiError(res.status, message);
    }
    return body as T;
  }

  return { request };
}

const HttpStatusUnauthorized = 401;
const HttpStatusNoContent = 204;
// A 401 from either of these can never be resolved by refreshing: /login
// failing means the credentials were wrong, and /refresh failing IS the
// refresh attempt — retrying it would recurse.
const AUTH_ENDPOINTS_EXEMPT_FROM_RETRY = new Set(["/auth/login", "/auth/refresh"]);

function isErrorBody(body: unknown): body is { message: string } {
  return (
    typeof body === "object" &&
    body !== null &&
    typeof (body as { message?: unknown }).message === "string"
  );
}
