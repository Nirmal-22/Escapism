import { NextFunction, Request, Response } from 'express';
import { ScoreService } from '../services/scoreService';
import { SESSION_COOKIE, readSession } from '../services/authService';

class ScoreController {
  private scoreService = new ScoreService();

  public createScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = readSession(req.cookies?.[SESSION_COOKIE]);
      if (!session) {
        // leaderboard is players-only; guests play locally and never submit
        res.status(401).json({ error: 'sign in to post scores to the leaderboard' });
        return;
      }
      const { name, score } = req.body ?? {};
      const saved = await this.scoreService.createScore(name ?? session.name, score, session.id);
      res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  };

  public getScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = await this.scoreService.getTopScores(req.query.limit, req.query.offset);
      res.status(200).json(page);
    } catch (err) {
      next(err);
    }
  };
}

export default ScoreController;
