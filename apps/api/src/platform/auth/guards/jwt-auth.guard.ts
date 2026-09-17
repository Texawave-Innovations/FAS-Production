// apps/api/src/platform/auth/guards/jwt-auth.guard.ts
import { Injectable } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";

// Verifies the access token (via JwtAccessStrategy) and populates req.user.
// Passport maps an expired/invalid/missing token to a 401 automatically.
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {}
