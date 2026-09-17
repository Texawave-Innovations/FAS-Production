// apps/api/src/platform/auth/guards/permissions.guard.ts
// Must run after JwtAuthGuard (see the @RequirePermission decorator, which
// applies both). Resolves the caller's role -> permissions via the RBAC
// join tables, using a Redis cache populated at login/refresh (see
// AuthService) so the common case is a cache hit, not a join query per
// request — matches ARCHITECTURE.md §7's "computed at login, cached in
// Redis" guidance.
import {
  ForbiddenException,
  Injectable,
  type CanActivate,
  type ExecutionContext,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import {
  PERMISSIONS_CACHE_PREFIX,
  PERMISSIONS_CACHE_TTL_SECONDS,
  PERMISSION_METADATA_KEY,
} from "../auth.constants.js";
import { AuthRepository } from "../repositories/auth.repository.js";
import type { AccessTokenPayload } from "../types/jwt-payload.types.js";
import { RedisService } from "../../../shared/redis/redis.service.js";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly redisService: RedisService,
    private readonly authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<string | undefined>(
      PERMISSION_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermission) return true;

    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException("No authenticated user on request");
    }
    if (user.roleId == null) {
      throw new ForbiddenException("User has no role assigned");
    }

    const permissionCodes = await this.getPermissionCodes(user.sub, user.roleId);
    if (!permissionCodes.includes(requiredPermission)) {
      throw new ForbiddenException(`Missing required permission: ${requiredPermission}`);
    }
    return true;
  }

  private async getPermissionCodes(userId: number, roleId: number): Promise<string[]> {
    const cacheKey = `${PERMISSIONS_CACHE_PREFIX}:${userId}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached) as string[];
    }

    const codes = await this.authRepository.findPermissionCodesForRole(roleId);
    await this.redisService.set(cacheKey, JSON.stringify(codes), PERMISSIONS_CACHE_TTL_SECONDS);
    return codes;
  }
}
