// apps/api/src/common/filters/all-exceptions.filter.ts
// Catches everything so every error response — expected (HttpException/
// BusinessException) or not — has the same shape. Never puts a stack trace
// in the response body, in any environment; the full error (with stack)
// goes to structured logs instead, keyed by the same correlationId a client
// can hand support/on-call for lookup.
import { STATUS_CODES } from "node:http";
import {
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { ClsService } from "nestjs-cls";
import { Logger } from "nestjs-pino";
import type { AppClsStore } from "../../platform/tenancy/tenancy.types.js";
import { getOrCreateCorrelationId } from "../utils/correlation-id.util.js";
import { BusinessException } from "../exceptions/business.exception.js";

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
  correlationId: string;
}

interface ResolvedError {
  status: number;
  message: string | string[];
  error: string;
}

@Injectable()
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly cls: ClsService<AppClsStore>,
    private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();

    const resolved = this.resolve(exception);
    const correlationId = this.cls.get("correlationId") ?? getOrCreateCorrelationId(request);

    const body: ErrorResponseBody = {
      statusCode: resolved.status,
      message: resolved.message,
      error: resolved.error,
      path: request.url,
      timestamp: new Date().toISOString(),
      correlationId,
    };

    this.logger.error(
      { err: exception, correlationId, path: request.url, statusCode: resolved.status },
      `Unhandled exception: ${resolved.error}`,
    );

    response.status(resolved.status).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof BusinessException) {
      const httpResponse = exception.getResponse();
      const message =
        typeof httpResponse === "string"
          ? httpResponse
          : ((httpResponse as { message?: string }).message ?? exception.message);
      return { status: exception.getStatus(), message, error: exception.errorCode };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const httpResponse = exception.getResponse();
      const statusText = STATUS_CODES[status] ?? "Error";
      if (typeof httpResponse === "string") {
        return { status, message: httpResponse, error: statusText };
      }
      const body = httpResponse as { message?: string | string[]; error?: string };
      return {
        status,
        message: body.message ?? exception.message,
        error: body.error ?? statusText,
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
      error: "Internal Server Error",
    };
  }
}
