import { model, Schema } from 'mongoose';

interface IActivity extends Document {
  board: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  action: string;
  createdAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    board: { type: Schema.Types.ObjectId, ref: 'Board', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
  },
  { timestamps: true },
);

export const Activity = model<IActivity>('Activity', ActivitySchema);
