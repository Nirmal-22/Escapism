# Escapism 🟩

A browser 3D dodge game. You are a green cube; red cubes want you dead. Dodge them as the world speeds up, then claim your rank on the global leaderboard.

**▶ Play:** `https://<your-project>.vercel.app` *(add the real URL after the first deploy)*

> 📸 *Add a gameplay GIF here — it's the first thing visitors look for.*

## Controls

`WASD` move · `Space` jump · `P` pause · drag mouse to orbit the camera

## How it's built

| Piece | Tech | Where |
|---|---|---|
| Game | Three.js (r128), single file, zero build step | [index.html](index.html) |
| API | Express + TypeScript, wrapped as a Vercel serverless function | [3d-cube-game-backend/src](3d-cube-game-backend/src), entry [api/index.ts](api/index.ts) |
| Database | Neon Postgres (serverless HTTP driver) | [db.ts](3d-cube-game-backend/src/db.ts), [schema.sql](3d-cube-game-backend/schema.sql) |

```
Browser ── /  ───────► Vercel static hosting (index.html)
        └─ /api/* ───► Vercel function (api/index.ts → Express app) ───► Neon Postgres
```

The same Express app also runs as a normal server for local development ([server.ts](3d-cube-game-backend/src/server.ts)), serving the game at the same origin — dev and prod behave identically.

Gameplay engineering notes:

- **Frame-rate independent physics *and* spawning** — spawn probability is per second, not per frame, so a 144 Hz monitor doesn't make the game 2.4× harder than a 60 Hz one.
- **Delta-time clamping + auto-pause** on tab switch — no teleporting enemies after alt-tab.
- **Difficulty ramps with score** — spawn rate and enemy speed scale up to a cap, so runs actually end.
- **Server-side validation and ranking** — name/score bounds enforced in the service layer; rank computed against the score index on insert.

## API

| Route | Description |
|---|---|
| `POST /api/scores` | Body `{ "name": "...", "score": 42 }` → `201` with `{ name, score, date, rank }` |
| `GET /api/scores?limit=10` | Top scores, highest first (limit capped at 100) |
| `GET /api/health` | Liveness check |

Validation: name 1–20 printable chars, score an integer 0–100000. Errors come back as `{ "error": "message" }`.

## Run locally

```sh
npm install
cp .env.example .env    # paste your Neon connection string
npm run dev             # game + API at http://localhost:3000
```

The Neon serverless driver talks HTTP to Neon's proxy, so local dev also points at your (free) cloud database — no local Postgres needed. The schema auto-creates on the first API call; [schema.sql](3d-cube-game-backend/schema.sql) is the reference DDL.

Other scripts: `npm run typecheck` · `npm run build:server` + `npm run start:server` (classic Node deploy without Vercel).

## Deploy (free)

1. Vercel → **Add New Project** → import this repo → framework preset **Other**, no build command → Deploy.
2. In the Vercel project: **Storage → Create Database → Neon (Postgres)** → connect. Vercel injects `DATABASE_URL` automatically.
3. Redeploy once so the function picks up the env var. Play, die, submit — the leaderboard is live.

## Roadmap

Touch controls · sound with mute · daily leaderboard · server-side run-duration sanity checks (anti-cheat) · ghost replay of your best run
