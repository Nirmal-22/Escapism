import { NextFunction, Request, Response } from 'express';
import { ScoreService } from '../services/scoreService';

class ScoreController {
  private scoreService = new ScoreService();

  public createScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, score } = req.body ?? {};
      const saved = await this.scoreService.createScore(name, score);
      res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  };

  public getScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const scores = await this.scoreService.getTopScores(req.query.limit);
      res.status(200).json(scores);
    } catch (err) {
      next(err);
    }
  };
}

export default ScoreController;
