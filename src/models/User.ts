import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company?: string;
  createdAt: string;
  isOnline: boolean;
  isAdmin: boolean;
  articles_liked: Array<mongoose.Types.ObjectId>;
  lastConnection?: Date;
  isVerified: boolean;
}

const UserSchema: Schema = new Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  company: { type: String },
  createdAt: { type: Date },
  isOnline: { type: Boolean, default: false },
  isAdmin: { type: Boolean, default: false },
  lastConnection: { type: Date },
  articles_liked: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article"
    }
  ],
  isVerified: { type: Boolean, default: false }
});

export default mongoose.model<IUser>("User", UserSchema);
