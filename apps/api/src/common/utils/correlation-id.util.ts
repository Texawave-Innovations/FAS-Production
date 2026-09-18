// apps/api/src/common/utils/correlation-id.util.ts
// Idempotent get-or-create rather than a dedicated "runs first" middleware —
// deliberately avoids depending on Nest's middleware mount order between
// TenancyModule's CLS setup, nestjs-pino's pino-http middleware, and
// AllExceptionsFilter. Whichever of those reads it first generates and
// caches the id on the request; everyone else just reads the same value
// back, so "correlation id exists before tenancy logic runs" holds by
// construction instead of by import-order assumption.
import { randomUUID } from "node:crypto";
import type { Request } from "express";

const CORRELATION_ID_HEADER = "x-correlation-id";

declare module "express" {
  interface Request {
    correlationId?: string;
  }
}

export function getOrCreateCorrelationId(req: Request): string {
  if (!req.correlationId) {
    const incoming = req.headers[CORRELATION_ID_HEADER];
    req.correlationId = (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
  }
  return req.correlationId;
}
