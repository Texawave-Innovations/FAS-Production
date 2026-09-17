import { Module } from "@nestjs/common";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { ConfigModule } from "./config/config.module.js";
import { AuthModule } from "./platform/auth/auth.module.js";
import { TenancyModule } from "./platform/tenancy/tenancy.module.js";
import { PrismaModule } from "./shared/prisma/prisma.module.js";
import { RedisModule } from "./shared/redis/redis.module.js";

@Module({
  imports: [ConfigModule, PrismaModule, RedisModule, TenancyModule, AuthModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
