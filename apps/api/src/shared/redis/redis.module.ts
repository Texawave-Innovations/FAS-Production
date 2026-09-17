// apps/api/src/shared/redis/redis.module.ts
import { Global, Module } from "@nestjs/common";
import { Redis } from "ioredis";
import { AppConfigService } from "../../config/app-config.service.js";
import { REDIS_CLIENT } from "./redis.constants.js";
import { RedisService } from "./redis.service.js";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (appConfig: AppConfigService) => new Redis(appConfig.redis.url),
      inject: [AppConfigService],
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
