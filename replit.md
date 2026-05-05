# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Expo mobile rideshare app (pt-BR) with an Express API server backed by MongoDB Atlas.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB Atlas via Mongoose (`lib/db`) — DB: `DbSistemaCaronaParaunaMobi`
- **Validation**: Zod
- **Build**: esbuild
- **Mobile**: Expo Router (React Native + web)

## MongoDB Collections

- `usuarios` — user profiles (IUser model)
- `corridas` — ride history (IRide model)
- `pagamentos` — payment methods (IPayment model)
- `saques` — withdrawal requests (IWithdrawal model)

## Environment Variables

- `MONGODB_URI` — MongoDB Atlas connection string (shared env)
- `MONGODB_DB` — Database name: `DbSistemaCaronaParaunaMobi` (shared env)

## Replit Workflows

- **API Server** — runs `pnpm --filter @workspace/api-server run dev` on port 8080 (console output)
- **RideShare App** — runs Expo web on port 5000 (webview output); scan the QR code from the Replit URL bar to test on a physical device via Expo Go

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-server run dev` — run API server locally (requires PORT env var)
- Restart workflows from the Replit UI after code changes

## Artifacts

### API Server (`artifacts/api-server`)

Express 5 server mounted at `/api`. Routes:
- `GET/PUT /api/users/:id` — get / upsert user profile
- `PATCH /api/users/:id/password` — update password hash
- `POST /api/users/login` — authenticate user
- `GET /api/rides?userId=` — user ride history
- `GET /api/rides?driverId=` — driver ride history
- `GET /api/rides/all` — admin: all platform rides
- `POST /api/rides` — create ride
- `PATCH /api/rides/:id` — update ride status/driver/completedAt
- `GET /api/payments?userId=` — user payment methods
- `POST /api/payments` — add payment method
- `DELETE /api/payments/:id?userId=` — remove payment method
- `GET /api/withdrawals` — all withdrawal requests (admin)
- `GET /api/withdrawals?driverId=` — driver's own withdrawals
- `POST /api/withdrawals` — driver creates withdrawal request
- `PATCH /api/withdrawals/:id` — admin approves/rejects withdrawal
- `POST /api/drivers/location` — driver posts real-time GPS location
- `GET /api/drivers/online` — admin gets list of currently online drivers (in-memory, 30s TTL)
- `GET /api/admin/payment-settings` — admin: get full payment settings (includes Stripe keys masked)
- `GET /api/admin/payment-settings/public` — passenger: get public payment settings (pixKey, pixKeyType, enabled flags)
- `PUT /api/admin/payment-settings` — admin: update payment settings (Pix key, rates, toggles, Stripe keys)

### RideShare App (`artifacts/rideshare`)

Expo mobile app (pt-BR). Theme: black + lime `#00D26A`. Uses `useColors()` hook.

**API client**: `utils/api.ts` — uses `/api` relative path on web.

**Auth** (`context/AuthContext.tsx`):
- Roles: `passenger` | `driver` | `admin`
- Methods: `login`, `register`, `logout`, `updateUser`, `updatePassword`, `switchRole`, `approveDriver`, `rejectDriver`, `checkDriverStatus`

**Withdrawal Logic** (`app/(driver)/earnings.tsx`):
- Available balance = total completed ride earnings - R$2/trip app fee - pending/approved withdrawals
- Cash tips excluded (already received directly)
- Driver enters PIX key and requests withdrawal
- Withdrawal history shown with status chips
- On submit: `POST /api/withdrawals` creates pending request

**Driver Location Tracking** (`app/(driver)/index.tsx`):
- When online: posts GPS location every 10s to `POST /api/drivers/location`
- When offline: sends online=false to remove from store
- API server maintains in-memory store with 30s TTL

**Admin Panel** (`app/admin.tsx`):
- Redesigned header with ADMIN badge
- 6 tabs: Motoristas | Viagens | Financeiro | Cupons | Mapa AO VIVO | Config.
- Tab badges for pending items
- Financeiro: 4 stat cards + withdrawal requests with approve/reject
- Mapa AO VIVO: polls `GET /api/drivers/online` every 8s, shows online drivers as car/moto icons on Leaflet map
- Config. (Configurações de Pagamento): Chave Pix, taxas/comissões, toggles de métodos (Pix/Cartão/Dinheiro), Stripe keys

**Payment Settings** (`lib/db/src/models/paymentSettings.ts`):
- MongoDB singleton: pixKey, pixKeyType, pixEnabled, cardEnabled, cashEnabled, cardFeePercent, commissionPercent, stripePublishableKey, stripeSecretKey
- Recommended gateway: Stripe (suporta Pix + BRL + cartões)

**Payment Methods** (`app/payment-methods.tsx`):
- Tab selector: Pix | Cartão
- Pix: tipo de chave (CPF/CNPJ/Telefone/E-mail/Aleatória) + campo de chave
- Cartão: número formatado (XXXX XXXX XXXX XXXX), titular, validade MM/AA, detecção de bandeira (Visa/Mastercard/Elo/Amex)

**Booking Pix Flow** (`app/booking.tsx`):
- Pagamento Pix: busca chave Pix da plataforma via `getPublicPaymentSettings`, mostra no modal com botão copiar
- Corrida criada com status `"awaiting_pix"` (invisível para motoristas)
- "Já realizei o pagamento" navega para ride/[id] com estado de espera; motorista só é acionado após admin confirmar
- Pagamento cartão: corrida criada diretamente com status `"searching"` (cobrança via Stripe quando integrado)

**Map** (`components/LeafletMap.web.tsx`):
- `showAsVehicle + vehicleType` — renders car/moto SVG icon instead of dot for driver
- `driverMarkers` — array of online drivers shown as car (blue) or moto (purple) icons with tooltips
- `adminMode` — enables zoom controls, slightly zoomed out view
- Dynamic update via `postMessage({ type: 'updateDriverMarkers', drivers })` without full re-render

**Screens**:
- `login`, `register` — auth
- `(tabs)/index` — passenger home map with ride request button
- `(tabs)/account` — passenger account menu
- `(driver)/index` — driver home (online toggle + live location posting + car/moto map icon)
- `(driver)/earnings` — earnings history + withdraw modal with PIX key input
- `booking` — pickup/destination + tier selection + Pix payment gate modal
- `ride/[id]` — live ride tracking screen
- `location-picker` — interactive map + geocoding search
- `admin` — admin panel: driver approvals, ride stats, withdrawals management, live driver map, payment settings
- `payment-methods` — add/remove Pix keys and credit/debit cards; set default payment method
