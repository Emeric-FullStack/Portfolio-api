import mongoose, { Schema, model, Document, Mongoose } from "mongoose";

export interface IArticle extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  summary: string;
  createdAt: Date;
  author: string;
  image: string;
  source: string;
  content: string;
  tags: string[];
  readingTime: string;
  external_link?: string;
}

export const ArticleSchema = new Schema<IArticle>({
  title: { type: String, required: true },
  summary: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  author: { type: String, default: "Tourel Emeric avec IA" },
  image: { type: String, required: false },
  source: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: [String], required: false },
  readingTime: { type: String, required: false },
  external_link: { type: String, required: false }
});

export default model<IArticle>("Article", ArticleSchema);
