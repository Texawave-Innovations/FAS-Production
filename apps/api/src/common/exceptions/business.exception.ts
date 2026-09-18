// apps/api/src/common/exceptions/business.exception.ts
// A distinct hierarchy from raw HttpException so AllExceptionsFilter (and
// future code) can tell "an expected, named business-rule violation" apart
// from an arbitrary framework/library exception. Every module's business
// rules (e.g. "can't close a work order with an open QA hold") should throw
// a BusinessException subclass, not a bare HttpException. Start small — add
// more subclasses as real modules need them, following this same shape.
import { HttpException, HttpStatus } from "@nestjs/common";

export abstract class BusinessException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus,
    public readonly errorCode: string,
  ) {
    super(message, status);
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, identifier: string | number) {
    super(`${resource} ${String(identifier)} not found`, HttpStatus.NOT_FOUND, "RESOURCE_NOT_FOUND");
  }
}

export class ResourceConflictException extends BusinessException {
  constructor(message: string) {
    super(message, HttpStatus.CONFLICT, "RESOURCE_CONFLICT");
  }
}
