# Pomodoria Backend

REST API for **Pomodoria**, a gamified Pomodoro productivity app. Uses Node.js, Express, MongoDB (Mongoose), and JWT authentication.

## Prerequisites

- **Node.js** (LTS recommended)
- **MongoDB** running and reachable at the URL in `.env` (default: `mongodb://127.0.0.1:27017/pomodoria`)

## Install

From this folder (`backend`):

```bash
npm install
```

## Environment

- **`.env`** — Created for local development with defaults (`PORT`, `MONGO_URI`, `JWT_SECRET`).
- **`.env.example`** — Same keys; copy if you need to recreate `.env`.

For production, set a strong `JWT_SECRET` (32+ characters), `JWT_REFRESH_SECRET`, and configure **SMTP** plus `APP_PUBLIC_URL` (your web app URL for verification links).

### Email verification & JWT

- **Register** creates the account and sends a verification email (web: `APP_PUBLIC_URL/verify-email?token=...`, mobile: `MOBILE_APP_SCHEME://verify-email?token=...`). No login until verified.
- **Login** requires a verified email.
- **Access token** (~1h) + **refresh token** (~7d), with issuer/audience checks.
- Without SMTP in dev, the verification URL is printed in the backend console.

Auth endpoints: `POST /api/auth/register`, `/login`, `/verify-email`, `/resend-verification`, `/refresh`, `/logout`.

## Run

**Development** (auto-restart on file changes):

```bash
npm run dev
```

**Production-style**:

```bash
npm start
```

On success you should see console output when **MongoDB connects**, then when the **HTTP server** starts (host and port).

Default URL: `http://localhost:5000` (or your `PORT`).

## Test the API

### Quick check

```bash
curl http://localhost:5000/health
```

Expected: `{"status":"ok"}`

### Sample requests

Open **`test.http`** in VS Code with the [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) extension (or any `.http`-compatible client).

1. Run **Register** or **Login** and copy the `token` from the JSON response.
2. Set the `@token` variable at the top of `test.http` to that value (or paste into the `Authorization` header).
3. Run **Create session** and **Get stats**.

### Example `curl` flows

Register:

```bash
curl -s -X POST http://localhost:5000/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Test User\",\"email\":\"test@test.com\",\"password\":\"123456\"}"
```

Login:

```bash
curl -s -X POST http://localhost:5000/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"test@test.com\",\"password\":\"123456\"}"
```

Create session (replace `YOUR_JWT`):

```bash
curl -s -X POST http://localhost:5000/api/sessions ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_JWT" ^
  -d "{\"type\":\"focus\",\"duration\":25,\"startTime\":\"2026-05-02T10:00:00.000Z\",\"completed\":true}"
```

Session stats:

```bash
curl -s http://localhost:5000/api/sessions/stats ^
  -H "Authorization: Bearer YOUR_JWT"
```

*(On macOS/Linux, use `\` instead of `^` for line continuation.)*

## Project layout

- `src/server.js` — Loads env, connects DB, starts HTTP server
- `src/app.js` — Express app, middleware, routes, `/health`
- `src/config/db.js` — MongoDB connection
- `src/routes/`, `src/controllers/`, `src/models/` — API modules

## Troubleshooting

- **Server exits immediately** — MongoDB is probably not running or `MONGO_URI` is wrong. Check the error printed after `MongoDB connection error`.
- **401 on `/api/sessions/*`** — Missing or invalid `Authorization: Bearer <token>` header.
