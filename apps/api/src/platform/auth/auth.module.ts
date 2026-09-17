// apps/api/src/platform/auth/auth.module.ts
import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { PermissionsGuard } from "./guards/permissions.guard.js";
import { AuthRepository } from "./repositories/auth.repository.js";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy.js";

@Module({
  // Every call site signs/verifies with an explicit secret+expiresIn (access
  // vs refresh use different secrets), so JwtModule needs no default options.
  imports: [JwtModule.register({}), PassportModule.register({ defaultStrategy: "jwt" })],
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, JwtAccessStrategy, PermissionsGuard],
  exports: [PermissionsGuard],
})
export class AuthModule {}
