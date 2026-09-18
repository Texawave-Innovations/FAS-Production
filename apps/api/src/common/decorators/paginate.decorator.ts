// apps/api/src/common/decorators/paginate.decorator.ts
// Extracts+validates page/limit query params into a PaginationDto so
// controllers never hand-parse pagination query params (see
// ARCHITECTURE.md §3). Usage: findAll(@Paginate() pagination: PaginationDto).
import { BadRequestException, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import type { Request } from "express";
import { PaginationDto } from "../dto/pagination.dto.js";

export const Paginate = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const request = ctx.switchToHttp().getRequest<Request>();
  const dto = plainToInstance(
    PaginationDto,
    { page: request.query.page, limit: request.query.limit },
    { enableImplicitConversion: true },
  );

  const errors = validateSync(dto);
  if (errors.length > 0) {
    const messages = errors.flatMap((error) => Object.values(error.constraints ?? {}));
    throw new BadRequestException(messages.length > 0 ? messages : "Invalid pagination params");
  }

  return dto;
});
