import mongoose, { Schema, Document } from "mongoose";

export interface IEmail extends Document {
  to: string;
  from: string;
  subject: string;
  html: string;
  type: "confirmation" | "reset_password";
  token: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
}

const EmailSchema: Schema = new Schema({
  to: { type: String, required: true },
  from: { type: String, required: true },
  subject: { type: String, required: true },
  html: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["confirmation", "reset_password"]
  },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  isUsed: { type: Boolean, default: false }
});

export default mongoose.model<IEmail>("Email", EmailSchema);
