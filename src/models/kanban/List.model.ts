import { model, Schema, Types } from 'mongoose';

export interface IList {
  _id: string;
  title: string;
  position: number;
  board: Schema.Types.ObjectId;
  cards?: Types.ObjectId[];
}

const ListSchema = new Schema<IList>(
  {
    title: { type: String, required: true },
    position: { type: Number, required: true },
    board: { type: Schema.Types.ObjectId, required: true, ref: 'Board' },
    cards: [{ type: Schema.Types.ObjectId, ref: 'Card' }],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

export const List = model<IList>('List', ListSchema);
