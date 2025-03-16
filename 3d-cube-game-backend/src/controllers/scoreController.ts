import { Request, Response } from 'express';
import { ScoreService } from '../services/scoreService';

class ScoreController {
    private scoreService: ScoreService;

    constructor() {
        this.scoreService = new ScoreService();
    }

    public createScore = async (req: Request, res: Response): Promise<void> => {
        try {
            const { name, score } = req.body;
            const newScore = await this.scoreService.createScore(name, score);
            res.status(201).json(newScore);
        } catch (error) {
            res.status(500).json({ message: 'Error saving score', error });
        }
    };

    public getScores = async (req: Request, res: Response): Promise<void> => {
        try {
            const scores = await this.scoreService.getScores();
            res.status(200).json(scores);
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving scores', error });
        }
    };
}

export default ScoreController;