// apps/api/src/platform/auth/entities/login-response.entity.ts
// Swagger-only response shape for POST /auth/login and POST /auth/refresh —
// AuthController returns plain object literals (see auth.controller.ts), so
// this exists purely to give SwaggerModule something to document; it's never
// constructed/returned at runtime. Filed under entities/ per
// FAS_ERP_CODING_STANDARDS.md §12: this describes a response shape, not a
// request payload, so it doesn't belong in dto/.
import { ApiProperty } from "@nestjs/swagger";
import { UserEntity } from "./user.entity.js";

export class LoginResponseEntity {
  @ApiProperty()
  accessToken: string;

  @ApiProperty({ type: UserEntity })
  user: UserEntity;
}

export class RefreshResponseEntity {
  @ApiProperty()
  accessToken: string;
}
