import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module.js";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter.js";
import { AppConfigService } from "./config/app-config.service.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appConfig = app.get(AppConfigService);

  // Replaces Nest's default console logger with nestjs-pino's structured
  // one globally — required bootstrap step per nestjs-pino's own docs.
  app.useLogger(app.get(Logger));

  app.use(cookieParser());
  app.enableCors({ origin: appConfig.app.uiOrigin, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  // Resolved via DI (see common/common.module.ts) rather than `new
  // AllExceptionsFilter()`, so it gets its ClsService/Logger dependencies —
  // registered here per the "global error handling" convention.
  app.useGlobalFilters(app.get(AllExceptionsFilter));

  // Swagger/OpenAPI — non-production only. Doubles as the future generation
  // source for packages/api-types (see that package's index.ts) once a
  // `generate` script reads /api-docs-json.
  if (appConfig.app.nodeEnv !== "production") {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("FAS ERP API")
        .setDescription("apps/api's REST surface — see docs/FAS_ERP_Architecture_Guide.md")
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup("api-docs", app, document);
  }

  await app.listen(appConfig.app.port);
}
await bootstrap();
