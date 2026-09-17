// apps/api/src/platform/auth/strategies/jwt-access.strategy.ts
import { Injectable } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { AppConfigService } from "../../../config/app-config.service.js";
import type { AccessTokenPayload } from "../types/jwt-payload.types.js";

// Registered under the 'jwt' passport strategy name — JwtAuthGuard extends
// AuthGuard('jwt') to use it. Populates req.user with the raw access token
// payload; that's actor identity, not tenancy — see platform/tenancy for
// why org/plant scoping reads from ClsService instead.
@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(appConfig: AppConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwt.accessSecret,
    });
  }

  validate(payload: AccessTokenPayload): AccessTokenPayload {
    return payload;
  }
}
