// packages/database/prisma/seed.ts
// Run via: pnpm --filter @fas-erp/database exec prisma db seed
import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────
// PERMISSION CATALOG
// This is the master list for the whole app. Phase 1 only needs platform
// permissions — RBAC/auth is the only thing that exists right now. As each
// business module gets built later, its permission strings get ADDED here
// (e.g. 'production.work_order.create' when the Production module lands).
// Nothing else about RBAC changes when that happens.
// Pattern: <module>.<entity>.<action>
// ─────────────────────────────────────────────────────────────────────────
const PERMISSIONS: Array<{ code: string; module: string; description: string }> = [
  { code: "platform.user.manage", module: "platform", description: "Create/edit/deactivate users" },
  {
    code: "platform.role.manage",
    module: "platform",
    description: "Create/edit roles and assign permissions",
  },
  { code: "platform.plant.manage", module: "platform", description: "Create/edit plants" },
  { code: "platform.audit.view", module: "platform", description: "View audit logs" },
];

async function main() {
  // 1. Demo organization
  const org = await prisma.organization.upsert({
    where: { slug: "fas-demo" },
    update: {},
    create: { name: "FAS Demo Org", slug: "fas-demo" },
  });

  // 2. Default plant — FAS runs one plant today; adding plant #2 later is
  // just another insert here, never a schema change.
  const mainPlant = await prisma.plant.upsert({
    where: { organizationId_code: { organizationId: org.id, code: "MAIN" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Main Plant",
      code: "MAIN",
    },
  });

  // 3. Permission catalog (global, not org-scoped)
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { module: p.module, description: p.description },
      create: p,
    });
  }

  // 3. Statuses — none seeded yet. The `statuses` table is platform
  // baseline infrastructure (§6.2 of ARCHITECTURE.md), but no module that
  // actually uses a status exists yet. When Production/Sales/etc. get
  // built, their statuses get added here in the same pattern the
  // architecture doc shows (module/code/label/colorToken/sortOrder).

  // 4. Super Admin role for the demo org, with every permission
  const superAdminRole = await prisma.role.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Super Admin" } },
    update: {},
    create: {
      organizationId: org.id,
      name: "Super Admin",
      description: "Full access to every module and setting",
      isSystem: true,
    },
  });

  const allPermissions = await prisma.permission.findMany();
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: superAdminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: permission.id },
    });
  }

  // 5. First admin user
  const passwordHash = await argon2.hash("ChangeMe123!"); // dev-only default, force reset on first login
  const adminUser = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: org.id, email: "admin@fas-demo.local" } },
    update: {},
    create: {
      organizationId: org.id,
      email: "admin@fas-demo.local",
      passwordHash,
      firstName: "FAS",
      lastName: "Admin",
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: superAdminRole.id },
  });

  // 6. Grant the admin user access to the default plant
  await prisma.userPlantAccess.upsert({
    where: { userId_plantId: { userId: adminUser.id, plantId: mainPlant.id } },
    update: {},
    create: { userId: adminUser.id, plantId: mainPlant.id, isDefault: true },
  });

  // 7. Document sequences — none seeded yet, same reasoning as statuses:
  // no module that generates a numbered document (work order, quotation,
  // ...) exists yet. Each module adds its own sequence rows here when built.

  console.log("Seed complete:", {
    org: org.slug,
    plant: mainPlant.code,
    permissions: allPermissions.length,
    role: superAdminRole.name,
    adminUser: adminUser.email,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
