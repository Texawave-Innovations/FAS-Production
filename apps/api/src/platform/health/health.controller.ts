// apps/api/src/platform/health/health.controller.ts
import { Controller, Get } from "@nestjs/common";
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import { RawResponse } from "../../common/decorators/raw-response.decorator.js";
import { PrismaService } from "../../shared/prisma/prisma.service.js";
import { RedisService } from "../../shared/redis/redis.service.js";

@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly healthIndicatorService: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // @RawResponse(): Terminus's { status, info, error, details } shape is
  // consumed by uptime/k8s probes as-is — wrapping it in the global
  // { data, meta } envelope (see common/interceptors/response.interceptor.ts)
  // would break that convention for no benefit.
  @Get()
  @RawResponse()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck("database", this.prisma),
      () =>
        this.healthIndicatorService
          .check("redis")
          .attempt(async () => {
            await this.redis.ping();
          }),
    ]);
  }
}
