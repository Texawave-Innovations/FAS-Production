// apps/api/src/config/configuration.ts
import type { StringValue } from "ms";
import { validateEnv, type Env } from "./env.schema.js";

export interface AppConfig {
  app: {
    nodeEnv: Env["NODE_ENV"];
    port: number;
    uiOrigin: string;
  };
  redis: {
    url: string;
  };
  jwt: {
    accessSecret: string;
    // Typed as `ms`'s StringValue (what @nestjs/jwt's SignOptions.expiresIn
    // expects) rather than plain `string` — safe because env.schema.ts
    // validates the same "\d+[smhdw]" shape at the process boundary.
    accessExpiresIn: StringValue;
    refreshSecret: string;
    refreshExpiresIn: StringValue;
  };
  logging: {
    level: Env["LOG_LEVEL"];
  };
}

export function buildConfig(): AppConfig {
  const env = validateEnv(process.env);
  return {
    app: {
      nodeEnv: env.NODE_ENV,
      port: env.API_PORT,
      uiOrigin: env.UI_ORIGIN,
    },
    redis: {
      url: env.REDIS_URL,
    },
    jwt: {
      accessSecret: env.JWT_ACCESS_SECRET,
      accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN as StringValue,
      refreshSecret: env.JWT_REFRESH_SECRET,
      refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN as StringValue,
    },
    logging: {
      level: env.LOG_LEVEL,
    },
  };
}
