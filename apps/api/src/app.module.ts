import { Module } from "@nestjs/common";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { CommonModule } from "./common/common.module.js";
import { LoggerModule } from "./common/logger/logger.module.js";
import { ConfigModule } from "./config/config.module.js";
import { AuthModule } from "./platform/auth/auth.module.js";
import { HealthModule } from "./platform/health/health.module.js";
import { TenancyModule } from "./platform/tenancy/tenancy.module.js";
import { PrismaModule } from "./shared/prisma/prisma.module.js";
import { RedisModule } from "./shared/redis/redis.module.js";

@Module({
  imports: [
    ConfigModule,
    LoggerModule,
    CommonModule,
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    TenancyModule,
    AuthModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
