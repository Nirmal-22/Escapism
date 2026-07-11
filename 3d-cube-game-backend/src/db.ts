import { neon } from '@neondatabase/serverless';

const SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS scores (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(24) NOT NULL,
    score      INTEGER     NOT NULL CHECK (score >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_scores_score_desc ON scores (score DESC)`
];

export class DbUnavailableError extends Error {
  public status = 503;
}

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new DbUnavailableError('DATABASE_URL is not set — add your Neon Postgres connection string');
  }
  return neon(url);
}

// Returns plain rows regardless of the driver's result shape (rows array vs { rows }).
export async function query(text: string, params: unknown[] = []): Promise<any[]> {
  const sql: any = getSql();
  const result = await sql.query(text, params);
  return Array.isArray(result) ? result : result.rows;
}

// Memoized per warm serverless instance; reset on failure so the next request retries.
let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await query(statement);
      }
    })().catch((err) => {
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
