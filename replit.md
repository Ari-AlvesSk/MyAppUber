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
- `artifacts/rideshare/components/LeafletMap.web.tsx` — Web Leaflet map (iframe-based)
- `artifacts/rideshare/components/LeafletMap.tsx` — Native Leaflet map (WebView-based)
- `lib/db/src/` — Mongoose models and `connectDB()`
- `lib/db/src/models/` — User, Ride, Payment, Withdrawal, Coupon, PaymentSettings, ChatMessage

## Architecture decisions

- The Expo app runs on port 5000 and the API runs on port 8080; on web, the Expo app calls `/api` (relative), which is served directly by the API server — no proxy needed since both run on Replit
- `MONGODB_URI` is stored as a Replit secret (not plaintext); `MONGODB_DB` and `PORT` are shared env vars
- Auth is custom (email+password with hashed storage in MongoDB) — no external auth provider
- Payments use Stripe (card) + Mercado Pago (Pix QR code); keys stored per-deployment in MongoDB's `paymentSettings` collection via admin panel
- Driver online tracking uses an in-memory store on the API server with 60s TTL (not persisted)
- LeafletMap uses `useMemo` + `useRef` for initial HTML to prevent iframe reloads on position updates; all subsequent position changes go via postMessage (`updateLocation`, `updateDriverCar`, `updateRoute`, `setTap`, `updateDriverMarkers`)

## Product

- **Passengers**: Request rides, track driver in real time on Waze-style map (car moving towards them → car moving to destination), pay via Pix/card/cash, apply coupons
- **Drivers**: Go online/offline, accept rides, navigate to passenger (phase 1: matched → "Cheguei"), embark passenger (phase 2: arriving → "Passageiro a bordo"), drive to destination (phase 3: in_progress → "Finalizar" only active within 300m of destination), cancel with reason selection
- **Admin**: Approve/reject driver registrations, view all rides, manage withdrawals, configure payment settings (Stripe keys, Pix key, pricing), view live driver map

## User preferences

- App is in Brazilian Portuguese (pt-BR)
- Theme: black background + lime green `#00D26A` accent

## Push Notifications

- **Backend**: `expo-server-sdk` sends via Expo's push service (handles APNs + FCM automatically)
- **Utility**: `artifacts/api-server/src/lib/pushNotifications.ts` — `sendPushToUser(userId, title, body)` and `sendPushToAdmins(...)`
- **Token endpoint**: `POST /api/notifications/token` saves token; `DELETE /api/notifications/token` clears on logout
- **Triggers**: ride status changes (accepted, arriving, in_progress, completed, cancelled), withdrawal approved/rejected, new driver registration → admin
- **Frontend**: `artifacts/rideshare/hooks/usePushNotifications.ts` — registers on native only (web stays with in-app toasts), activated via `<PushTokenRegistrar />` in `_layout.tsx`
- Push tokens stored in `pushToken` field on the `usuarios` MongoDB collection

## Live Ride Tracking

- **Driver location API**: `POST /api/drivers/location` (posts every 5s during active ride, 10s otherwise), `GET /api/drivers/online` (admin), `GET /api/drivers/:id/location` (passenger polls specific driver)
- **Passenger polling**: polls driver location every 5s when ride is `arriving` or `in_progress`
- **Map props for tracking**: `driverCarLat/Lng` (secondary moving car marker), `routeALat/Lng/routeBLat/Lng` (updatable dashed route line)
- **Finalize gate**: "Finalizar corrida" button only active when driver is within 300m of dropoff coordinates (or if no coords stored)
- **Cancel with reason**: driver can cancel with one of 6 pre-set reasons; `cancelReason` stored in MongoDB

## Chat & Compartilhamento

- **Chat em corrida**: `GET/POST /api/chat/:rideId` — mensagens salvas no MongoDB (`mensagens_chat`), polling a cada 4s em ambas as telas
- **Model**: `ChatMessage` (rideId, senderId, senderRole, text, createdAt) — exportado de `lib/db/src/models/chat.ts`
- **Passageiro**: botão "message-circle" no card do motorista abre modal de chat; badge de não-lidas aparece quando chat fechado
- **Motorista**: botão "Chat com passageiro" no painel da corrida (com badge); 6 balões de resposta rápida acima do input (ex: "Estou a caminho! 🚗")
- **Notificação push**: ao enviar mensagem, o outro lado recebe push via `sendPushToUser`
- **Compartilhar**: botão "Compartilhar no WhatsApp" visível nas fases matched/arriving/in_progress; usa `Share.share()` (native) ou `wa.me/?text=` (web)

## Gotchas

- The app shows a location permission gate before login on web (expected behavior — dismiss or navigate to /login directly)
- Mongoose logs duplicate index warnings for User model on startup — harmless
- Push notifications only work on real native devices (iOS/Android) — Expo Go or a dev build; web uses in-app toasts instead
- The `artifacts/api-server: API Server` workflow is a duplicate created by deployment and will always fail with EADDRINUSE — use the canonical "API Server" workflow only

## Pointers

- API routes: `artifacts/api-server/src/routes/index.ts`
- DB models: `lib/db/src/models/`
- Expo screens: `artifacts/rideshare/app/`
