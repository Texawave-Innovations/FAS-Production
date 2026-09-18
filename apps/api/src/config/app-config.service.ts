// apps/api/src/config/app-config.service.ts
// Thin typed wrapper around @nestjs/config's ConfigService so the rest of
// the app injects `AppConfigService` and gets real types back instead of
// stringly-keyed `configService.get('jwt.accessSecret')` calls everywhere.
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { AppConfig } from "./configuration.js";

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  get app(): AppConfig["app"] {
    return this.configService.getOrThrow<AppConfig["app"]>("app");
  }

  get redis(): AppConfig["redis"] {
    return this.configService.getOrThrow<AppConfig["redis"]>("redis");
  }

  get jwt(): AppConfig["jwt"] {
    return this.configService.getOrThrow<AppConfig["jwt"]>("jwt");
  }

  get logging(): AppConfig["logging"] {
    return this.configService.getOrThrow<AppConfig["logging"]>("logging");
  }
}
