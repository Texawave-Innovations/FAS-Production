// apps/api/src/platform/auth/auth.controller.ts
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { CookieOptions, Request, Response } from "express";
import { AUTH_CONSTANTS } from "../../common/constants/auth.constants.js";
import { PERMISSIONS } from "../../common/constants/permissions.constants.js";
import { AppConfigService } from "../../config/app-config.service.js";
import { parseDurationToSeconds } from "../../shared/utils/duration.util.js";
import { AuthService } from "./auth.service.js";
import { CurrentUser } from "./decorators/current-user.decorator.js";
import { LoginDto } from "./dto/login.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { RequirePermission } from "./decorators/require-permission.decorator.js";
import type { AccessTokenPayload } from "./types/jwt-payload.types.js";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly appConfig: AppConfigService,
  ) {}

  @Post("login")
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto.email,
      dto.password,
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      this.readRefreshCookie(req),
    );
    this.setRefreshCookie(res, refreshToken);
    return { accessToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(this.readRefreshCookie(req));
    res.clearCookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, this.cookieOptions());
    return { success: true };
  }

  // Session hydration: the UI calls this after obtaining an access token
  // (on login, or after a silent refresh on page load) to get the full
  // profile shape rather than just the JWT's narrow claims.
  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AccessTokenPayload) {
    return this.authService.getProfile(user.sub);
  }

  // Proves PermissionsGuard end-to-end against the seeded RBAC data:
  // Super Admin has all 4 seeded permissions, so this succeeds for
  // admin@fas-demo.local and 403s for any role without platform.user.manage.
  @Get("permission-check")
  @RequirePermission(PERMISSIONS.PLATFORM_USER_MANAGE)
  permissionCheck(@CurrentUser() user: AccessTokenPayload) {
    return { ok: true, userId: user.sub, roleId: user.roleId };
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = req.cookies as Record<string, string | undefined> | undefined;
    return cookies?.[AUTH_CONSTANTS.REFRESH_COOKIE_NAME];
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(AUTH_CONSTANTS.REFRESH_COOKIE_NAME, token, {
      ...this.cookieOptions(),
      maxAge: parseDurationToSeconds(this.appConfig.jwt.refreshExpiresIn) * 1000,
    });
  }

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.appConfig.app.nodeEnv === "production",
      sameSite: "strict",
      path: AUTH_CONSTANTS.REFRESH_COOKIE_PATH,
    };
  }
}
