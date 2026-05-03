# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Expo mobile rideshare app (pt-BR) with an Express API server backed by PostgreSQL.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation**: Zod (routes use `zod`, schema lib uses `zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec in `lib/api-spec`)
- **Build**: esbuild
- **Mobile**: Expo Router (React Native + web)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run typecheck:libs` — build composite libs (run before leaf typechecks)
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks/Zod from OpenAPI
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Artifacts

### API Server (`artifacts/api-server`)

Express 5 server mounted at `/api`. Routes:
- `GET/PUT /api/users/:id` — get / upsert user profile
- `PATCH /api/users/:id/password` — update password hash
- `GET /api/rides?userId=` — user ride history
- `GET /api/rides/all` — admin: all platform rides
- `POST /api/rides` — create ride
- `PATCH /api/rides/:id` — update ride status/driver/completedAt
- `GET /api/payments?userId=` — user payment methods
- `POST /api/payments` — add payment method
- `DELETE /api/payments/:id?userId=` — remove payment method

### RideShare App (`artifacts/rideshare`)

Expo mobile app (pt-BR). Theme: black + lime `#00D26A`. Uses `useColors()` hook.

**Config**: `app.config.ts` (converted from app.json) — sets `extra.apiBase` from `REPLIT_DOMAINS` env var.

**API client**: `utils/api.ts` — uses `/api` relative path on web, `extra.apiBase` on native.

**Auth** (`context/AuthContext.tsx`):
- AsyncStorage key: `rideshare:auth:v1`
- Roles: `passenger` | `driver` | `admin` (admin@rideshare.com)
- Methods: `login`, `register`, `logout`, `updateUser`, `updatePassword`, `switchRole`, `approveDriver`, `rejectDriver`, `checkDriverStatus`
- Syncs to `/api/users/:id` (fire-and-forget, AsyncStorage is source of truth)

**Rides/Payments** (`context/RideContext.tsx`):
- AsyncStorage keys: `rideshare:rides:v1`, `rideshare:platform_rides:v1`, `rideshare:custom_payments:v1`
- `setUserId(id)` must be called after login/register to enable API sync
- Syncs rides to `/api/rides` and payments to `/api/payments` (fire-and-forget)

**Location** (`context/LocationContext.tsx`):
- expo-location GPS + reverse geocoding
- Exposes `address`, `coords`, `granted`, `loading`, `requestPermission`

**Screens**:
- `login`, `register` — call `setUserId(u.id)` from RideContext after auth
- `(tabs)/index` — passenger home map with ride request button
- `(tabs)/account` — passenger account menu
- `(driver)/index` — driver home (online toggle + ride request simulation)
- `(driver)/earnings` — earnings history
- `booking` — pickup/destination + tier selection; pickup tappable → opens `/location-picker`
- `ride/[id]` — live ride tracking screen
- `location-picker` — interactive SVG map + geocoding search + GPS button; result returned via `_locationPickerCallback` module-level pattern
- `profile-edit`, `payment-methods`, `promos`, `security`, `notifications`, `help`, `legal` — passenger account sub-screens
- `admin` — admin panel: ride stats, financial tracking, driver approvals

**Location Picker callback pattern** (`app/location-picker.tsx`):
```typescript
// In booking.tsx — before navigating:
registerLocationPickerCallback((result) => { setCustomPickup(result); });
router.push("/location-picker");
// location-picker calls _locationPickerCallback(result) then router.back()
```

## Database Schema (`lib/db`)

Tables: `users`, `rides`, `payments` — see `lib/db/src/schema/`.
