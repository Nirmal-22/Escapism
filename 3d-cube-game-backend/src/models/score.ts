// Shapes returned by the leaderboard API.
// Persistence is plain SQL against Neon Postgres — see ../db.ts and ../../schema.sql.
export interface Score {
  name: string;
  score: number;
  date: string;
}

export interface RankedScore extends Score {
  rank: number;
}
