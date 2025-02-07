import { Schema, model } from 'mongoose';

interface IBoard extends Document {
  title: string;
  description?: string;
  owner: Schema.Types.ObjectId;
  members: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const BoardSchema = new Schema<IBoard>(
  {
    title: { type: String, required: true },
    description: { type: String },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

export const Board = model<IBoard>('Board', BoardSchema);
