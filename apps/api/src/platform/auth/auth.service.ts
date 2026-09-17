// apps/api/src/platform/auth/auth.service.ts
import { randomUUID } from "node:crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { AppConfigService } from "../../config/app-config.service.js";
import { RedisService } from "../../shared/redis/redis.service.js";
import { parseDurationToSeconds } from "../../shared/utils/duration.util.js";
import { PERMISSIONS_CACHE_PREFIX, REFRESH_TOKEN_KEY_PREFIX } from "./auth.constants.js";
import { AuthRepository } from "./repositories/auth.repository.js";
import type { AccessTokenPayload, RefreshTokenPayload } from "./types/jwt-payload.types.js";
import { verifyPassword } from "./utils/password.util.js";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: number;
  activePlantId: number | null;
  roleId: number | null;
}

export interface LoginResult extends TokenPair {
  user: AuthUser;
}

// Shape returned by AuthRepository's findActiveUserBy{Email,Id} — narrowed
// to just what toAuthUser() needs, so the mapper doesn't depend on Prisma's
// generated payload type directly.
interface AuthUserRow {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: number;
  userRoles: Array<{ roleId: number }>;
  plantAccess: Array<{ plantId: number }>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
    private readonly redisService: RedisService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.authRepository.findActiveUserByEmail(email);
    if (!user || !(await verifyPassword(user.passwordHash, password))) {
      // Same error for "no such user" and "wrong password" — don't let the
      // response shape reveal whether an email exists.
      throw new UnauthorizedException("Invalid email or password");
    }

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokenPair({
      sub: authUser.id,
      organizationId: authUser.organizationId,
      activePlantId: authUser.activePlantId,
      roleId: authUser.roleId,
    });
    await this.cachePermissions(authUser.id, authUser.roleId);

    return { ...tokens, user: authUser };
  }

  // Backs GET /auth/me — lets the UI hydrate/restore session state (after a
  // page reload, once a silent refresh has produced a fresh access token)
  // from the same AuthUser shape login() returns.
  async getProfile(userId: number): Promise<AuthUser> {
    const user = await this.authRepository.findActiveUserById(userId);
    if (!user) {
      throw new UnauthorizedException("User is no longer active");
    }
    return this.toAuthUser(user);
  }

  async refresh(refreshToken: string | undefined): Promise<TokenPair> {
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.appConfig.jwt.refreshSecret,
      });
    } catch {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    const redisKey = this.refreshKey(payload.sub, payload.jti);
    const stillValid = await this.redisService.get(redisKey);
    if (!stillValid) {
      throw new UnauthorizedException("Refresh token has been revoked");
    }
    // Rotate: invalidate the old token before issuing a new one, so a
    // replayed copy of this same refresh token can never be redeemed twice.
    await this.redisService.del(redisKey);

    const user = await this.authRepository.findActiveUserById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User is no longer active");
    }

    const authUser = this.toAuthUser(user);
    const tokens = await this.issueTokenPair({
      sub: authUser.id,
      organizationId: authUser.organizationId,
      activePlantId: authUser.activePlantId,
      roleId: authUser.roleId,
    });
    await this.cachePermissions(authUser.id, authUser.roleId);
    return tokens;
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;

    try {
      const payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.appConfig.jwt.refreshSecret,
      });
      await this.redisService.del(this.refreshKey(payload.sub, payload.jti));
      await this.redisService.del(`${PERMISSIONS_CACHE_PREFIX}:${payload.sub}`);
    } catch {
      // Already expired/invalid/foreign — nothing to revoke. Logout stays
      // idempotent rather than erroring on a token that's already dead.
    }
  }

  private async issueTokenPair(basePayload: AccessTokenPayload): Promise<TokenPair> {
    const accessToken = await this.jwtService.signAsync(basePayload, {
      secret: this.appConfig.jwt.accessSecret,
      expiresIn: this.appConfig.jwt.accessExpiresIn,
    });

    const jti = randomUUID();
    const refreshPayload: RefreshTokenPayload = { sub: basePayload.sub, jti };
    const refreshToken = await this.jwtService.signAsync(refreshPayload, {
      secret: this.appConfig.jwt.refreshSecret,
      expiresIn: this.appConfig.jwt.refreshExpiresIn,
    });

    const ttlSeconds = parseDurationToSeconds(this.appConfig.jwt.refreshExpiresIn);
    await this.redisService.set(this.refreshKey(basePayload.sub, jti), "1", ttlSeconds);

    return { accessToken, refreshToken };
  }

  private async cachePermissions(userId: number, roleId: number | null): Promise<void> {
    if (roleId == null) return;
    const codes = await this.authRepository.findPermissionCodesForRole(roleId);
    const ttlSeconds = parseDurationToSeconds(this.appConfig.jwt.accessExpiresIn);
    await this.redisService.set(
      `${PERMISSIONS_CACHE_PREFIX}:${userId}`,
      JSON.stringify(codes),
      ttlSeconds,
    );
  }

  private refreshKey(userId: number, jti: string): string {
    return `${REFRESH_TOKEN_KEY_PREFIX}:${userId}:${jti}`;
  }

  private toAuthUser(user: AuthUserRow): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      organizationId: user.organizationId,
      activePlantId: user.plantAccess[0]?.plantId ?? null,
      roleId: user.userRoles[0]?.roleId ?? null,
    };
  }
}
