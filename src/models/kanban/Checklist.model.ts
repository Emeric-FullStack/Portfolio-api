import { model, Schema } from "mongoose";

export interface IChecklistItem {
  _id?: string;
  text: string;
  isCompleted: boolean;
  position: number;
}

export interface IChecklist {
  _id: string;
  title: string;
  items: IChecklistItem[];
  cardId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  card: string;
  board: string;
  list: string;
  isCompleted: boolean;
}

const ChecklistItemSchema = new Schema<IChecklistItem>({
  text: { type: String, required: true },
  isCompleted: { type: Boolean, default: false },
  position: { type: Number, required: true }
}, { _id: true });

const ChecklistSchema = new Schema<IChecklist>({
  title: { type: String, required: true },
  items: [ChecklistItemSchema],
  cardId: { type: String, required: true },
  position: { type: Number, required: true },
  card: { type: String, required: true },
  board: { type: String, required: true },
  list: { type: String, required: true },
  isCompleted: { type: Boolean, default: false }
}, {
  timestamps: true
});

export const Checklist = model<IChecklist>("Checklist", ChecklistSchema); 