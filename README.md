# FAS ERP

FAS ERP is a production monorepo for a modular-monolith ERP system: a NestJS API (`apps/api`), a Next.js web frontend (`apps/ui`), and an Expo/React Native mobile shell (`apps/mobile`), sharing framework-agnostic business logic, generated API types, and a design system through `packages/*`. The top-level layout is `apps/*` for deployable applications, `packages/*` for shared code (config, core logic, API types, UI kit, and the Prisma-backed database layer), and `deployment/*` for the CI plumbing (CodeBuild projects/roles) that sits above each app's own per-environment deploy stack. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full design.

## Getting started

```sh
pnpm install && docker compose up -d && turbo dev
```
