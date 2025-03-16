import Score, { IScore } from '../models/score';

export class ScoreService {
    public async createScore(name: string, score: number): Promise<IScore> {
        const newScore = new Score({
            name,
            score,
            date: new Date().toISOString(),
        });
        await newScore.save();
        return newScore;
    }

    public async getScores(): Promise<IScore[]> {
        return await Score.find().sort({ score: -1 }).exec();
    }
}