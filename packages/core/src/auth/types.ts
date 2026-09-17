// packages/core/src/auth/types.ts
// Mirrors apps/api/src/platform/auth's AuthUser/LoginResult response shapes.
// Hand-written for now — packages/api-types will generate this once the
// OpenAPI pipeline exists (see that package's README).
export interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: number;
  activePlantId: number | null;
  roleId: number | null;
}

export interface LoginResult {
  accessToken: string;
  user: AuthUser;
}

export interface RefreshResult {
  accessToken: string;
}
