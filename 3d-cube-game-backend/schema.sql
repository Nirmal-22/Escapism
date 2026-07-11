-- Escapism leaderboard schema.
-- The API also creates this automatically on first request (see src/db.ts),
-- so running this by hand in the Neon SQL editor is optional.
CREATE TABLE IF NOT EXISTS scores (
  id         SERIAL PRIMARY KEY,
  name       VARCHAR(24) NOT NULL,
  score      INTEGER     NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC);
