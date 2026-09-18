// apps/api/src/platform/auth/entities/user.entity.ts
// First concrete use of the common/ entities pattern (see
// CODING_STANDARDS.md): a response shape needed here because it differs
// from the raw Prisma User model — it flattens activePlantId/roleId out of
// nested relations and must never expose passwordHash.
import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose } from "class-transformer";

// Shape returned by AuthRepository's findActiveUserBy{Email,Id} — narrowed
// to just what fromUser() needs, so the mapper doesn't depend on Prisma's
// generated payload type directly. passwordHash is intentionally present
// here (the repository's rows always carry it, e.g. for login's password
// check) — it's what makes @Exclude() below a real guarantee rather than
// decorative, since fromUser() takes it in and the interceptor strips it out.
export interface AuthUserRow {
  id: number;
  email: string;
  passwordHash: string;
  firstName: string | null;
  lastName: string | null;
  organizationId: number;
  userRoles: Array<{ roleId: number }>;
  plantAccess: Array<{ plantId: number }>;
}

// Returned by GET /auth/me and as the `user` field of POST /auth/login.
// ClassSerializerInterceptor (registered globally, see common/common.module.ts)
// strips @Exclude()-marked fields during HTTP serialization — passwordHash
// can never reach a response body no matter how this entity gets
// constructed, instead of relying on every call site to hand-omit it.
export class UserEntity {
  @ApiProperty()
  @Expose()
  id: number;

  @ApiProperty()
  @Expose()
  email: string;

  @ApiProperty({ nullable: true, type: String })
  @Expose()
  firstName: string | null;

  @ApiProperty({ nullable: true, type: String })
  @Expose()
  lastName: string | null;

  @ApiProperty()
  @Expose()
  organizationId: number;

  @ApiProperty({ nullable: true, type: Number })
  @Expose()
  activePlantId: number | null;

  @ApiProperty({ nullable: true, type: Number })
  @Expose()
  roleId: number | null;

  @Exclude()
  passwordHash?: string;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  static fromUser(row: AuthUserRow): UserEntity {
    return new UserEntity({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      organizationId: row.organizationId,
      activePlantId: row.plantAccess[0]?.plantId ?? null,
      roleId: row.userRoles[0]?.roleId ?? null,
      passwordHash: row.passwordHash,
    });
  }
}
