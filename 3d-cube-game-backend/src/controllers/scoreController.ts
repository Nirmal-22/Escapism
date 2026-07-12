import { NextFunction, Request, Response } from 'express';
import { ScoreService } from '../services/scoreService';
import { SESSION_COOKIE, readSession } from '../services/authService';

class ScoreController {
  private scoreService = new ScoreService();

  public createScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = readSession(req.cookies?.[SESSION_COOKIE]);
      const { name, score } = req.body ?? {};
      // signed-in runs bind to the player; body name still wins for display
      const saved = await this.scoreService.createScore(name ?? session?.name, score, session?.id ?? null);
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
