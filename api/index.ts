// Vercel serverless entry point: wraps the Express app so every /api/* request
// (see vercel.json rewrites) is handled by the same app used in local dev.
import app from '../3d-cube-game-backend/src/app';

export default app;
