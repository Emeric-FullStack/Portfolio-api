import mongoose, { Schema, Document } from 'mongoose';

export interface IUserLog extends Document {
  userId: string;
  action: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

const UserLogSchema: Schema = new Schema({
  userId: { type: String, required: false },
  action: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
});

export default mongoose.model<IUserLog>('UserLog', UserLogSchema);
