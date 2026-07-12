import { ensureSchema, query } from '../db';
import { RankedScore, Score } from '../models/score';

const NAME_MAX_LENGTH = 20;
const SCORE_MAX = 100000;
const LEADERBOARD_MAX_LIMIT = 100;

export class ValidationError extends Error {
  public status = 400;
}

// Shared with authService for display names.
export function parsePlayerName(raw: unknown): string {
  if (typeof raw !== 'string') {
    throw new ValidationError('name must be a string');
  }
  const printable = Array.from(raw)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');
  const name = printable.replace(/\s+/g, ' ').trim();
  if (!name) {
    throw new ValidationError('name is required');
  }
  if (name.length > NAME_MAX_LENGTH) {
    throw new ValidationError(`name must be at most ${NAME_MAX_LENGTH} characters`);
  }
  return name;
}

function parseScore(raw: unknown): number {
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > SCORE_MAX) {
    throw new ValidationError(`score must be an integer between 0 and ${SCORE_MAX}`);
  }
  return value;
}

// Leaderboard identity: signed-in players count once (their best run, via
// player_id); guest rows have no player_id and count per-run (-id keeps each
// row a distinct entity, never colliding with positive player ids).
export class ScoreService {
  public async createScore(rawName: unknown, rawScore: unknown, playerId: number | null = null): Promise<RankedScore> {
    const name = parsePlayerName(rawName);
    const score = parseScore(rawScore);
    await ensureSchema();

    const [saved] = await query(
      'INSERT INTO scores (name, score, player_id) VALUES ($1, $2, $3) RETURNING name, score, created_at',
      [name, score, playerId]
    );
    const [{ rank }] = await query(
      `SELECT COUNT(*)::int + 1 AS rank FROM (
         SELECT COALESCE(player_id, -id) AS entity, MAX(score) AS best_score
         FROM scores
         GROUP BY COALESCE(player_id, -id)
       ) t
       WHERE t.best_score > $1 AND ($2::int IS NULL OR t.entity <> $2)`,
      [score, playerId]
    );

    return { name: saved.name, score: saved.score, date: saved.created_at, rank };
  }

  public async getTopScores(rawLimit?: unknown): Promise<Score[]> {
    const requested = Number(rawLimit);
    const limit =
      Number.isInteger(requested) && requested > 0 ? Math.min(requested, LEADERBOARD_MAX_LIMIT) : 10;
    await ensureSchema();

    const rows = await query(
      `SELECT name, score, created_at FROM (
         SELECT DISTINCT ON (COALESCE(player_id, -id)) name, score, created_at
         FROM scores
         ORDER BY COALESCE(player_id, -id), score DESC, created_at ASC
       ) best
       ORDER BY score DESC, created_at ASC
       LIMIT $1`,
      [limit]
    );
    return rows.map((row) => ({ name: row.name, score: row.score, date: row.created_at }));
  }
}
