# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## RideShare app (`artifacts/rideshare`)

Expo mobile app (pt-BR). Features:

- **Auth**: `context/AuthContext.tsx` (AsyncStorage `rideshare:auth:v1`). Roles: `passenger` | `driver`. Login/register/logout/switchRole.
- **Auth gate**: `app/_layout.tsx` `<AuthGate>` redirects to `/login` when signed out, `/(driver)` when role=driver, `/(tabs)` when role=passenger.
- **Routes**: `login`, `register`, `(tabs)` (passenger area), `(driver)` (driver area: `index` online toggle + ride request, `earnings`, `account`), `booking`, `ride/[id]`.
- **Pricing**: `computePriceCents(distanceKm, perKm, min)` from `data/mock.ts`. Tiers: moto (R$5 min, R$5/km), car (R$8 min, R$10/km).
