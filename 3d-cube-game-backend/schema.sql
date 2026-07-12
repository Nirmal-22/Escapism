-- Escapism schema.
-- The API also creates all of this automatically on first request (see src/db.ts),
-- so running this by hand in the Neon SQL editor is optional.

-- Player identities: Google OAuth (google_sub) and/or email+password (password_hash).
CREATE TABLE IF NOT EXISTS players (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE,
  google_sub    TEXT UNIQUE,
  password_hash TEXT,
  display_name  VARCHAR(24) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT players_identity CHECK (google_sub IS NOT NULL OR password_hash IS NOT NULL)
);

-- Runs. player_id is NULL for guest runs.
CREATE TABLE IF NOT EXISTS scores (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(24) NOT NULL,
  score      INTEGER     NOT NULL CHECK (score >= 0),
  player_id  INTEGER     REFERENCES players(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scores ADD COLUMN IF NOT EXISTS player_id INTEGER REFERENCES players(id);

CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
CREATE INDEX IF NOT EXISTS idx_scores_player ON scores (player_id);
