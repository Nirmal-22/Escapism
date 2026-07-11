import { ensureSchema, query } from '../db';
import { RankedScore, Score } from '../models/score';

const NAME_MAX_LENGTH = 20;
const SCORE_MAX = 100000;
const LEADERBOARD_MAX_LIMIT = 100;

export class ValidationError extends Error {
  public status = 400;
}

function parseName(raw: unknown): string {
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

export class ScoreService {
  public async createScore(rawName: unknown, rawScore: unknown): Promise<RankedScore> {
    const name = parseName(rawName);
    const score = parseScore(rawScore);
    await ensureSchema();

    const [saved] = await query(
      'INSERT INTO scores (name, score) VALUES ($1, $2) RETURNING name, score, created_at',
      [name, score]
    );
    const [{ rank }] = await query(
      'SELECT COUNT(*)::int + 1 AS rank FROM scores WHERE score > $1',
      [score]
    );

    return { name: saved.name, score: saved.score, date: saved.created_at, rank };
  }

  public async getTopScores(rawLimit?: unknown): Promise<Score[]> {
    const requested = Number(rawLimit);
    const limit =
      Number.isInteger(requested) && requested > 0 ? Math.min(requested, LEADERBOARD_MAX_LIMIT) : 10;
    await ensureSchema();

    const rows = await query(
      'SELECT name, score, created_at FROM scores ORDER BY score DESC, created_at ASC LIMIT $1',
      [limit]
    );
    return rows.map((row) => ({ name: row.name, score: row.score, date: row.created_at }));
  }
}
