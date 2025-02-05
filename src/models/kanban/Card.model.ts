import { model, Schema, Types } from "mongoose";
import { IComment } from "./Comment.model";
import { IChecklist } from "./Checklist.model";

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export interface ICard {
  _id: string;
  title: string;
  description?: string;
  listId: string;
  boardId: string;
  position: number;
  priority?: CardPriority;
  labels?: string[];
  comments?: IComment[];
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  assignedTo?: string;
  checklists?: Types.ObjectId[];
}

const CardSchema = new Schema<ICard>({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  listId: { type: String, required: true },
  boardId: { type: String, required: true },
  position: { type: Number, required: true },
  priority: { 
    type: String, 
    enum: Object.values(CardPriority),
    default: CardPriority.MEDIUM 
  },
  labels: [{ type: Schema.Types.ObjectId, ref: 'Label' }],
  comments: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
  dueDate: { type: Date },
  assignedTo: { type: String },
  checklists: [{ type: Schema.Types.ObjectId, ref: 'Checklist' }]
}, {
  timestamps: true
});

export const Card = model<ICard>("Card", CardSchema);