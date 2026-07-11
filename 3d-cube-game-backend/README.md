# Escapism — Leaderboard API

Express + TypeScript service that stores runs and serves the global leaderboard for [Escapism](../README.md). Persistence is Neon Postgres via `@neondatabase/serverless`. In production the app is wrapped as a Vercel serverless function ([../api/index.ts](../api/index.ts)); locally it runs as a normal Node server.

## Layout

```
src/
├── app.ts                          # Express app (no listen) — shared by dev server & Vercel function
├── server.ts                       # local dev entry: serves the game + API on one origin
├── db.ts                           # Neon driver, query helper, lazy schema creation
├── routes/scoreRoutes.ts           # /api/scores wiring
├── controllers/scoreController.ts  # HTTP layer
├── services/scoreService.ts        # validation + SQL
└── models/score.ts                 # API response shapes
schema.sql                          # reference DDL (auto-applied on first request)
```

Dependencies live in the **repo-root `package.json`** — one manifest for the function bundle, the dev server, and the tooling. (They were previously split across two manifests, which broke fresh installs.)

## Endpoints

- `POST /api/scores` — `{ name, score }` → `201 { name, score, date, rank }`. Name is trimmed and control-character-stripped, 1–20 chars; score must be an integer 0–100000. Rank is `COUNT(*) + 1` over strictly higher scores.
- `GET /api/scores?limit=10` — top scores ordered `score DESC, created_at ASC`, limit capped at 100.
- `GET /api/health` — `{ ok: true }`.

Errors return `{ "error": "message" }` with `400` (validation), `503` (`DATABASE_URL` missing), or `500`.

## Environment

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Neon Postgres connection string (Vercel injects it when a Neon database is connected to the project) |
| `PORT` | Local dev server port (default 3000) |

## Run

From the repo root: `npm run dev` (ts-node) · `npm run typecheck` · `npm run build:server` then `npm run start:server`.
