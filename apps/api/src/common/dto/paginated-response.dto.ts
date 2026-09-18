// apps/api/src/common/dto/paginated-response.dto.ts
// Returned by any service method backing a paginated list endpoint.
// common/interceptors/response.interceptor.ts detects this shape via
// `instanceof` and unwraps it into the { data: items, meta } envelope,
// instead of every controller having to shape its own response.
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export class PaginatedResponseDto<T> {
  readonly items: T[];
  readonly meta: PaginationMeta;

  constructor(items: T[], page: number, limit: number, total: number) {
    this.items = items;
    this.meta = { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
  }
}
