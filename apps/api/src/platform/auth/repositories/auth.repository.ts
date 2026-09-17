// apps/api/src/platform/auth/repositories/auth.repository.ts
// The only place in platform/auth that talks to Prisma — see
// CODING_STANDARDS.md §3. AuthService depends on this, never on
// PrismaService directly.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../shared/prisma/prisma.service.js";

// Login/refresh only ever need "does this user have a role, and which plant
// do they default into" — not the full User row with every relation.
const authUserInclude = {
  userRoles: { select: { roleId: true }, take: 1 },
  plantAccess: { where: { isDefault: true }, select: { plantId: true }, take: 1 },
} as const;

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findActiveUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email, isActive: true, deletedAt: null },
      include: authUserInclude,
    });
  }

  findActiveUserById(id: number) {
    return this.prisma.user.findFirst({
      where: { id, isActive: true, deletedAt: null },
      include: authUserInclude,
    });
  }

  async findPermissionCodesForRole(roleId: number): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      select: { permission: { select: { code: true } } },
    });
    return rows.map((row) => row.permission.code);
  }
}
