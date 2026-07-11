import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import scoreRoutes from './routes/scoreRoutes';

// Express app shared by the local dev server (server.ts) and the Vercel
// serverless function (api/index.ts) — no listen() here.
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.use('/api/scores', scoreRoutes);

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

export default app;
