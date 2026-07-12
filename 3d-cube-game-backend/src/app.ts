import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/authRoutes';
import scoreRoutes from './routes/scoreRoutes';

// Express app shared by the local dev server (server.ts) and the Vercel
// serverless function (api/index.ts) — no listen() here.
const app = express();

// behind Vercel's proxy: makes req.protocol reflect x-forwarded-proto
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;
