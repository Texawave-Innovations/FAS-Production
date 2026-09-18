// apps/api/src/common/logger/logger.module.ts
// nestjs-pino over Winston: JSON-structured output needs no extra formatter
// package (Winston would need one for comparable structuring), lower
// overhead, and its Logger/PinoLogger drop straight into Nest's own Logger
// interface via app.useLogger() in main.ts, so existing `new Logger(...)`
// call sites (see e.g. the event listener in platform/auth/listeners) get
// structured output for free.
import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";
import type { Request } from "express";
import { AppConfigService } from "../../config/app-config.service.js";
import { getOrCreateCorrelationId } from "../utils/correlation-id.util.js";

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => ({
        pinoHttp: {
          level: appConfig.logging.level,
          // JSON in production; human-readable in development. pino-pretty
          // is a devDependency — never loaded outside non-production.
          transport:
            appConfig.app.nodeEnv === "production"
              ? undefined
              : { target: "pino-pretty", options: { singleLine: true } },
          // Same idempotent helper TenancyModule's CLS setup uses — whichever
          // of the two runs first for a given request generates the id, the
          // other just reads it back (see that util's file comment).
          genReqId: (req) => getOrCreateCorrelationId(req as Request),
          customProps: (req) => ({ correlationId: getOrCreateCorrelationId(req as Request) }),
          redact: {
            paths: ["req.headers.authorization", "req.headers.cookie", "res.headers"],
            censor: "[redacted]",
          },
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
