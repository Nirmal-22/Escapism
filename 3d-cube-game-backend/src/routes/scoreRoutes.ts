import { Router } from 'express';
import ScoreController from '../controllers/scoreController';

const router = Router();
const scoreController = new ScoreController();

// POST /api/scores — save a run; responds with the saved row plus its leaderboard rank
router.post('/', scoreController.createScore);

// GET /api/scores?limit=10 — top scores, highest first
router.get('/', scoreController.getScores);

export default router;
