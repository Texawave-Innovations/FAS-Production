// apps/api/src/config/config.module.ts
// Global env validation + typed config service. Imported once in AppModule;
// every other module injects AppConfigService instead of reading
// process.env directly — that's how "no magic strings/secrets" is enforced.
import { Global, Module } from "@nestjs/common";
import { ConfigModule as NestConfigModule } from "@nestjs/config";
import { AppConfigService } from "./app-config.service.js";
import { buildConfig } from "./configuration.js";
import { validateEnv } from "./env.schema.js";

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
      validate: validateEnv,
      load: [buildConfig],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class ConfigModule {}
