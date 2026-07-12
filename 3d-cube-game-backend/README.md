# Escapism — Leaderboard API

Express + TypeScript service that stores runs and serves the global leaderboard for [Escapism](../README.md). Persistence is Neon Postgres via `@neondatabase/serverless`. In production the app is wrapped as a Vercel serverless function ([../api/index.ts](../api/index.ts)); locally it runs as a normal Node server.

## Layout

```
src/
├── app.ts                          # Express app (no listen) — shared by dev server & Vercel function
├── server.ts                       # local dev entry: serves the game + API on one origin
├── db.ts                           # Neon driver, query helper, lazy schema creation
├── routes/                         # /api/scores and /api/auth wiring
├── controllers/                    # HTTP layer (scores, auth/session cookies)
├── services/                       # scoreService: validation + SQL · authService: OAuth 2.0 + bcrypt + JWT
└── models/score.ts                 # API response shapes
schema.sql                          # reference DDL (auto-applied on first request)
```

Dependencies live in the **repo-root `package.json`** — one manifest for the function bundle, the dev server, and the tooling. (They were previously split across two manifests, which broke fresh installs.)

## Endpoints

- `POST /api/scores` — **requires a session cookie** (guests get 401; the leaderboard is players-only). `{ name, score }` → `201 { name, score, date, rank }`. Name is trimmed and control-character-stripped, 1–20 chars; score must be an integer 0–100000. Rank counts players with a strictly higher best.
- `GET /api/scores?limit=10&offset=0` — paginated top-100, best-per-player (`DISTINCT ON` + window count) → `{ scores, total, offset, limit }`.
- `POST /api/auth/signup` — `{ email, password, name? }` → creates a bcrypt-hashed account, sets the session cookie.
- `POST /api/auth/login` — `{ email, password }` → verifies and sets the session cookie (uniform 401, no user enumeration).
- `GET /api/auth/google` / `GET /api/auth/google/callback` — OAuth 2.0 authorization-code flow with a signed-state CSRF check; links to an existing password account when the Google-verified email matches.
- `GET /api/auth/me` — `{ google, password, signedIn, name?, best? }` (per-method availability flags).
- `POST /api/auth/logout` — clears the session cookie.
- `GET /api/health` — `{ ok: true }`.

Sessions are stateless JWTs in an httpOnly `SameSite=Lax` cookie (30 days) — no session store, serverless-friendly. Errors return `{ "error": "message" }` with `400`/`401`/`409` (validation/auth), `503` (not configured / DB missing), or `500`.

## Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string |
| `SESSION_SECRET` | Signs session cookies; enables email/password sign-in (`openssl rand -hex 32`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Enables "Continue with Google" (OAuth web client) |
| `APP_URL` | Optional: force the OAuth callback base URL (auto-derived otherwise) |
| `PORT` | Local dev server port (default 3000) |

## Run

From the repo root: `npm run dev` (ts-node) · `npm run typecheck` · `npm run build:server` then `npm run start:server`.
