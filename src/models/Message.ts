// models/Message.ts
import mongoose, { Schema, model, Document } from "mongoose";

interface IMessage extends Document {
  content: string;
  sender: mongoose.Types.ObjectId;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Référence à User
  createdAt: { type: Date, default: Date.now }
});

export default model<IMessage>("Message", MessageSchema);
