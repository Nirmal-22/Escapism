import { Router } from 'express';
// import ScoreController from '../controllers/scoreController';

import Score from '../models/score'; // Import the Score model

const router = Router();

// Can also use a controller to handle the routes
// const scoreController = new ScoreController();

// // POST /api/scores
// router.post('/', scoreController.createScore);

// // GET /api/scores
// router.get('/', scoreController.getScores);

// POST /api/scores
router.post('/', async (req, res) => {
    try {
        const { name, score } = req.body;
        const newScore = new Score({ name, score });
        await newScore.save();
        res.status(201).json(newScore);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save score2' });
    }
});

export default router;