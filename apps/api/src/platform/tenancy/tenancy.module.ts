// apps/api/src/platform/tenancy/tenancy.module.ts
//
// ARCHITECTURAL RULE: downstream services/repositories read tenancy
// (organizationId, activePlantId) from ClsService, NEVER from req.user.
// req.user (set by JwtAuthGuard/JwtAccessStrategy) exists for *actor*
// identity — "who performed this action", e.g. audit_logs.actor_id — and
// is only populated on guarded routes, after guards run. ClsService is
// populated by the middleware below, which runs for every request before
// any guard, so it is the only context a repository can rely on being
// present for org/plant scoping (see ARCHITECTURE.md §7).
//
// The CLS middleware itself does not reject invalid/missing/expired
// tokens — that's JwtAuthGuard's job on routes that require auth. This
// middleware is best-effort context population for every request.
import { Global, Module } from "@nestjs/common";
import { ClsModule, ClsService } from "nestjs-cls";
import { JwtModule, JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { AppConfigService } from "../../config/app-config.service.js";
import type { AccessTokenPayload } from "../auth/types/jwt-payload.types.js";
import type { AppClsStore } from "./tenancy.types.js";

@Global()
@Module({
  imports: [
    JwtModule.register({}),
    ClsModule.forRootAsync({
      inject: [JwtService, AppConfigService],
      useFactory: (jwtService: JwtService, appConfig: AppConfigService) => ({
        global: true,
        middleware: {
          mount: true,
          setup: (cls: ClsService<AppClsStore>, req: Request) => {
            const authHeader = req.headers.authorization;
            if (!authHeader?.startsWith("Bearer ")) return;

            try {
              const payload = jwtService.verify<AccessTokenPayload>(
                authHeader.slice("Bearer ".length),
                {
                  secret: appConfig.jwt.accessSecret,
                },
              );
              cls.set("userId", payload.sub);
              cls.set("organizationId", payload.organizationId);
              cls.set("activePlantId", payload.activePlantId);
              cls.set("roleId", payload.roleId);
            } catch {
              // Invalid/expired access token — leave the CLS store empty.
              // JwtAuthGuard rejects the request downstream on routes that
              // actually require auth; public routes proceed with no context.
            }
          },
        },
      }),
    }),
  ],
  exports: [ClsModule, JwtModule],
})
export class TenancyModule {}
