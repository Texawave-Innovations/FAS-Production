// packages/api-types/src/auth.types.ts
// Wire shapes for apps/api's platform/auth endpoints. Hand-written today —
// see this package's README note — but framework-agnostic on purpose (no
// class-transformer/class-validator decorators here) so it stays a clean
// generation target once an OpenAPI pipeline reads apps/api's Swagger spec
// (see apps/api/src/main.ts's SwaggerModule setup) and regenerates this file.
// These describe the *unwrapped* payload apps/ui/mobile actually see after
// packages/core/src/api/client.ts strips the { data, meta } envelope —
// mirrors apps/api/src/platform/auth/entities/user.entity.ts's exposed shape.
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
