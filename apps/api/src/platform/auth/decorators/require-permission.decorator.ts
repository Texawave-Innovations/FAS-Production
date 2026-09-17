// apps/api/src/platform/auth/decorators/require-permission.decorator.ts
// Single decorator per ARCHITECTURE.md §7's usage example — bundles the
// metadata PermissionsGuard reads with the guards that must run to produce
// it, so a route handler never forgets @UseGuards(JwtAuthGuard).
//
// Usage: @RequirePermission('production.work_order.approve')
import { UseGuards, applyDecorators } from "@nestjs/common";
import { SetMetadata } from "@nestjs/common";
import { PERMISSION_METADATA_KEY } from "../auth.constants.js";
import { JwtAuthGuard } from "../guards/jwt-auth.guard.js";
import { PermissionsGuard } from "../guards/permissions.guard.js";

export function RequirePermission(permission: string): MethodDecorator & ClassDecorator {
  return applyDecorators(
    SetMetadata(PERMISSION_METADATA_KEY, permission),
    UseGuards(JwtAuthGuard, PermissionsGuard),
  );
}
