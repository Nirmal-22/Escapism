import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import morgan from 'morgan';
import app from './app';

const PORT = Number(process.env.PORT) || 3000;
// src/ (ts-node) and dist/ (compiled) sit at the same depth, so this is the repo root either way.
const repoRoot = path.resolve(__dirname, '..', '..');

const server = express();
server.use(morgan('dev'));
server.get('/', (_req, res) => res.sendFile(path.join(repoRoot, 'index.html')));
server.use(app);

server.listen(PORT, () => {
  console.log(`Escapism running at http://localhost:${PORT} (game + API, same origin as production)`);
});
