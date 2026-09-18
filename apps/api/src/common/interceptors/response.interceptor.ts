// apps/api/src/common/interceptors/response.interceptor.ts
// Wraps every successful response as { data, meta } — see
// packages/core/src/api/client.ts for where the frontend unwraps it back
// off, and common/decorators/raw-response.decorator.ts for routes that opt
// out (health checks, future webhooks/file downloads).
//
// Must run *after* ClassSerializerInterceptor has already stripped
// @Exclude() fields off any entity in the response (see common.module.ts's
// provider order — this is registered first, so its response-mapping runs
// last / outermost, wrapping the already-serialized value).
import {
  Injectable,
  type CallHandler,
  type ExecutionContext,
  type NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { map, type Observable } from "rxjs";
import { RAW_RESPONSE_METADATA_KEY } from "../decorators/raw-response.decorator.js";
import { PaginatedResponseDto } from "../dto/paginated-response.dto.js";

export interface Envelope<T> {
  data: T;
  meta: Record<string, unknown>;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, Envelope<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<Envelope<T> | T> {
    const isRaw = this.reflector.getAllAndOverride<boolean | undefined>(RAW_RESPONSE_METADATA_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) {
      return next.handle();
    }

    return next.handle().pipe(
      map((body): Envelope<T> | T => {
        if (body instanceof PaginatedResponseDto) {
          // PaginatedResponseDto's own generic is unrelated to this
          // interceptor's T from TS's point of view, even though at runtime
          // this is exactly Envelope<T>'s shape — hence the double cast.
          return { data: body.items, meta: body.meta } as unknown as Envelope<T>;
        }
        return { data: body, meta: {} };
      }),
    );
  }
}
