// import { mongoose, Schema, model, Document } from 'mongoose';
import { Schema, model, Document } from 'mongoose';

export interface IScore extends Document {
    name: string;
    score: number;
    date: Date;
}

const scoreSchema = new Schema({
    name: { type: String, required: true },
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { collection: 'escapism'});

const Score = model<IScore>('Score', scoreSchema);
// const Score = mongoose.model('Score', scoreSchema);

export default Score;