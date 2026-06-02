# Pomodoria

Cross-platform productivity app: Pomodoro timer, tasks, XP/levels, streaks, and a growing character companion.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Node.js, Express 5, MongoDB, Mongoose |
| Web | React 19, TypeScript, Vite |
| Mobile | Expo 54, React Native |

## Quick start (local)

### Prerequisites

- Node.js 20+
- MongoDB running locally (or MongoDB Atlas URI)

### 1. Backend

```bash
cd backend
cp .env.example .env   # edit JWT_SECRET, MONGO_URI, SMTP if needed
npm install
npm run dev
```

API: `http://localhost:5000` — health: `GET /health`

### 2. Web

```bash
cd frontend-web
cp .env.example .env     # VITE_API_URL=http://localhost:5000
npm install
npm run dev
```

App: `http://localhost:5173`

### 3. Mobile (Expo)

```bash
cd mobile
npm install
# Optional: .\scripts\write-lan-env.ps1  for physical device on LAN
npm run go
```

Copy `mobile/.env.example` to `mobile/.env` or run `npm run setup:api` (Windows) to set `EXPO_PUBLIC_API_URL` to your LAN IP for Expo Go.

### Deep links (mobile)

The app registers the `pomodoria://` scheme. Email links include both web and mobile URLs when `MOBILE_APP_SCHEME=pomodoria` is set on the backend.

| Path | Example |
|------|---------|
| Verify email | `pomodoria://verify-email?token=…` |
| Reset password | `pomodoria://reset-password?token=…` |

Test on a device: `npx uri-scheme open "pomodoria://reset-password?token=test" --android`

## Docker (backend only)

```bash
docker compose up --build
```

Backend runs on port 5000. MongoDB on 27017. Set `JWT_SECRET` in `docker-compose.yml` or via env file before production use.

## Deployment

### Backend → Render / Railway

1. Connect repo, set root to `backend`
2. Build: `npm install`
3. Start: `npm start`
4. Env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `APP_PUBLIC_URL`, SMTP vars

Or use included `render.yaml` blueprint.

### Web → Vercel

1. Import repo, set root to `frontend-web`
2. Build: `npm run build`
3. Output: `dist`
4. Env: `VITE_API_URL=https://your-api.example.com`

### Mobile → EAS (optional)

```bash
cd mobile
npx eas-cli build --platform android
```

Set `EXPO_PUBLIC_API_URL` in EAS secrets.

### MongoDB Atlas

1. Create free cluster
2. Database user + network access (IP allowlist or 0.0.0.0/0 for dev)
3. Copy connection string → `MONGO_URI`

## Main API routes

- `POST /api/auth/register|login|forgot-password|reset-password`
- `GET/POST /api/auth/verify-email`
- `GET /api/users/me`, `PATCH /api/users/me`
- `GET/POST /api/tasks`, `PATCH /api/tasks/:id/complete`
- `GET/POST /api/sessions`

## Scripts

```bash
# Backend smoke test (server must be running)
cd backend && node scripts/smoke-api.js

# Web E2E (build + preview; auth tests need Mongo for seed)
cd frontend-web && npm run build && npm run test:e2e
```

See `backend/README.md` for detailed API examples.
