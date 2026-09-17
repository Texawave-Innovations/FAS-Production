// apps/api/src/shared/prisma/prisma.module.ts
// Global: every module injects PrismaService directly rather than each
// re-importing this module. Per CODING_STANDARDS.md §3, PrismaService is
// only ever called from a feature's *.repository.ts — never a service.
import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
