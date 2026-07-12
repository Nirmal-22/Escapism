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
| `POST /api/auth/signup` | `{ email, password, name? }` → account + session cookie |
| `POST /api/auth/login` | `{ email, password }` → session cookie |
| `GET /api/auth/google` | Redirects to Google's consent screen (OAuth 2.0 code flow) |
| `GET /api/auth/me` | `{ google, password, signedIn, name?, best? }` |
| `POST /api/auth/logout` | Clears the session cookie |
| `GET /api/health` | Liveness check |

Validation: name 1–20 printable chars, score an integer 0–100000. Errors come back as `{ "error": "message" }`.

Leaderboard semantics: signed-in players appear once with their **best** run; guest runs count individually. Signed-in runs also carry your personal best across devices.

## Sign in (optional)

Guests can always play. Accounts (hand-rolled — no auth SDK) exist so scores follow you across devices:

- **Email + password** — bcrypt-hashed credentials on the `players` table. Enabled by setting `SESSION_SECRET` (generate with `openssl rand -hex 32`).
- **Continue with Google** — OAuth 2.0 authorization-code flow implemented directly in Express, with a signed-state CSRF check and stateless JWT sessions in an httpOnly cookie. Also requires `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`:
  1. [console.cloud.google.com](https://console.cloud.google.com) → new project → **APIs & Services → OAuth consent screen** → External → fill in the app name → publish.
  2. **Credentials → Create Credentials → OAuth client ID → Web application** → add redirect URIs `http://localhost:3000/api/auth/google/callback` and `https://<your-app>.vercel.app/api/auth/google/callback`.
  3. Copy the client ID and secret into `.env` (and Vercel env vars).

A Google sign-in with the same (verified) email as an existing password account links to it automatically. Without any of these env vars, the Sign-in button simply doesn't render.

## Run locally

```sh
npm install
cp .env.example .env    # paste your Neon connection string
npm run dev             # game + API at http://localhost:3000
```

The Neon serverless driver talks HTTP to Neon's proxy, so local dev also points at your (free) cloud database — no local Postgres needed. The schema auto-creates on the first API call; [schema.sql](3d-cube-game-backend/schema.sql) is the reference DDL.

Other scripts: `npm run typecheck` · `npm run build:server` + `npm run start:server` (classic Node deploy without Vercel).

## Deploy (free)

1. Vercel → **Add New Project** → import this repo → framework preset **Other**, no build command.
2. **Environment Variables**: add `DATABASE_URL` (your Neon connection string). For sign-in, also add `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
3. Deploy. Every push to `main` auto-deploys from then on.

## Roadmap

Password reset (needs an email service) · rate limiting on auth + scores · touch controls · sound with mute · daily leaderboard · server-side run-duration sanity checks (anti-cheat) · ghost replay of your best run
