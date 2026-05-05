# Paraúna Mobi

A ride-hailing (rideshare) app for Brazil: Expo mobile + web frontend for passengers/drivers/admin, backed by an Express API with MongoDB Atlas.

## Run & Operate

- **Start everything**: Run the "Project" workflow (starts both API Server and RideShare App in parallel)
- **API Server only**: `pnpm --filter @workspace/api-server run dev` (requires `PORT` env var, default 8080)
- **RideShare App only**: `PORT=5000 pnpm --filter @workspace/rideshare exec expo start --web --port 5000`
- **Typecheck all**: `pnpm run typecheck`
- **Required env vars**: `MONGODB_URI` (secret), `MONGODB_DB`, `PORT`

## Stack

- **Monorepo**: pnpm workspaces
- **Node.js**: 20 (nodejs-20 module)
- **API**: Express 5 + TypeScript (ESM), built with esbuild
- **Database**: MongoDB Atlas via Mongoose (`lib/db`) — DB: `DbSistemaCaronaParaunaMobi`
- **Validation**: Zod
- **Mobile/Web**: Expo Router (React Native + react-native-web)
- **Payments**: Stripe + Mercado Pago Pix

## Where things live

- `artifacts/api-server/src/` — Express API server source
- `artifacts/api-server/src/routes/` — all route handlers
- `artifacts/rideshare/app/` — Expo Router screens
- `artifacts/rideshare/context/` — React contexts (Auth, Location, Ride, Notification)
- `artifacts/rideshare/utils/api.ts` — API client (uses `/api` relative on web)
- `lib/db/src/` — Mongoose models and `connectDB()`
- `lib/db/src/models/` — User, Ride, Payment, Withdrawal, Coupon, PaymentSettings

## Architecture decisions

- The Expo app runs on port 5000 and the API runs on port 8080; on web, the Expo app calls `/api` (relative), which is served directly by the API server — no proxy needed since both run on Replit
- `MONGODB_URI` is stored as a Replit secret (not plaintext); `MONGODB_DB` and `PORT` are shared env vars
- Auth is custom (email+password with hashed storage in MongoDB) — no external auth provider
- Payments use Stripe (card) + Mercado Pago (Pix QR code); keys stored per-deployment in MongoDB's `paymentSettings` collection via admin panel
- Driver online tracking uses an in-memory store on the API server with 30s TTL (not persisted)

## Product

- **Passengers**: Request rides, track in real time, pay via Pix/card/cash, apply coupons
- **Drivers**: Go online/offline, accept rides, track earnings, request Pix withdrawals
- **Admin**: Approve/reject driver registrations, view all rides, manage withdrawals, configure payment settings (Stripe keys, Pix key, pricing), view live driver map

## User preferences

- App is in Brazilian Portuguese (pt-BR)
- Theme: black background + lime green `#00D26A` accent

## Gotchas

- The app shows a location permission gate before login on web (expected behavior — dismiss or navigate to /login directly)
- Mongoose logs duplicate index warnings for User model on startup — harmless, can be fixed by removing duplicate `index: true` declarations in the User schema
- `REPLIT_EXPO_DEV_DOMAIN` is used for the Expo packager proxy URL in the dev script

## Pointers

- API routes: `artifacts/api-server/src/routes/index.ts`
- DB models: `lib/db/src/models/`
- Expo screens: `artifacts/rideshare/app/`
