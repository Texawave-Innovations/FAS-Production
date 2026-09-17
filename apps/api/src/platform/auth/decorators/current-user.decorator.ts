// apps/api/src/platform/auth/decorators/current-user.decorator.ts
// Actor identity for the current request (e.g. audit_logs.actor_id) — not
// a tenancy source. Only populated on routes behind JwtAuthGuard.
import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { AccessTokenPayload } from "../types/jwt-payload.types.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AccessTokenPayload => {
    const request = ctx.switchToHttp().getRequest<Request & { user: AccessTokenPayload }>();
    return request.user;
  },
);
