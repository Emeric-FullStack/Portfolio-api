import { Schema, model, Types } from 'mongoose';

export interface IComment {
    _id: Types.ObjectId;
    text: string;
    card: Types.ObjectId;
    user: Types.ObjectId;
    createdAt: Date;
}

const commentSchema = new Schema<IComment>({
    _id: { type: Schema.Types.ObjectId, required: true },
    text: { type: String, required: true },
    card: { type: Schema.Types.ObjectId, ref: 'Card', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
});

export const Comment = model<IComment>('Comment', commentSchema);