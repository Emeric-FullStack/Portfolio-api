// models/Message.ts
import mongoose, { Schema, Document, Types } from "mongoose";

// Interface de base pour un message
interface IMessageBase {
  content: string;
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

// Interface pour le document Mongoose
export interface IMessage extends IMessageBase, Document {}

// Interface pour un message après population
export interface IMessagePopulated
  extends Omit<IMessage, "sender" | "receiver"> {
  sender: {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
  };
  receiver: {
    _id: Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
  };
}

const messageSchema = new Schema<IMessage>({
  content: { type: String, required: true },
  sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
  receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model<IMessage>("Message", messageSchema);
