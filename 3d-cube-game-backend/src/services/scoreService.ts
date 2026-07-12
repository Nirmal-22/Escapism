import { ensureSchema, query } from '../db';
import { RankedScore, Score } from '../models/score';

const NAME_MAX_LENGTH = 20;
const SCORE_MAX = 100000;
const LEADERBOARD_SIZE = 100;
const PAGE_MAX = 100;

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

function parsePage(raw: unknown, fallback: number, max: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 0 ? Math.min(value, max) : fallback;
}

export interface LeaderboardPage {
  scores: Score[];
  total: number;
  offset: number;
  limit: number;
}

// The leaderboard is players-only: guests play locally and never POST here
// (the controller rejects sessionless submits). Each player appears once,
// with their best run.
export class ScoreService {
  public async createScore(rawName: unknown, rawScore: unknown, playerId: number): Promise<RankedScore> {
    const name = parsePlayerName(rawName);
    const score = parseScore(rawScore);
    await ensureSchema();

    const [saved] = await query(
      'INSERT INTO scores (name, score, player_id) VALUES ($1, $2, $3) RETURNING name, score, created_at',
      [name, score, playerId]
    );
    const [{ rank }] = await query(
      `SELECT COUNT(*)::int + 1 AS rank FROM (
         SELECT player_id, MAX(score) AS best_score
         FROM scores
         WHERE player_id IS NOT NULL
         GROUP BY player_id
       ) t
       WHERE t.best_score > $1 AND t.player_id <> $2`,
      [score, playerId]
    );

    return { name: saved.name, score: saved.score, date: saved.created_at, rank };
  }

  public async getTopScores(rawLimit?: unknown, rawOffset?: unknown): Promise<LeaderboardPage> {
    const limit = Math.max(1, parsePage(rawLimit, 10, PAGE_MAX));
    const offset = parsePage(rawOffset, 0, LEADERBOARD_SIZE);
    await ensureSchema();

    // best run per player → top 100 → requested page; the window count is the
    // top-100 size, so the client can render pagination from any page.
    const rows = await query(
      `SELECT name, score, created_at, COUNT(*) OVER()::int AS total
       FROM (
         SELECT name, score, created_at FROM (
           SELECT DISTINCT ON (player_id) name, score, created_at
           FROM scores
           WHERE player_id IS NOT NULL
           ORDER BY player_id, score DESC, created_at ASC
         ) per_player
         ORDER BY score DESC, created_at ASC
         LIMIT ${LEADERBOARD_SIZE}
       ) top
       ORDER BY score DESC, created_at ASC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return {
      scores: rows.map((row) => ({ name: row.name, score: row.score, date: row.created_at })),
      total: rows.length ? rows[0].total : 0,
      offset,
      limit
    };
  }
}
