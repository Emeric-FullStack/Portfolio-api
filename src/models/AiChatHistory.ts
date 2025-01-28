import mongoose, { Schema, Document } from "mongoose";

export interface IAiChatHistory extends Document {
  userId: mongoose.Types.ObjectId;
  messages: Array<{
    content: string;
    isUser: boolean;
    timestamp: Date;
    model: "openai" | "deepseek";
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const AiChatHistorySchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    messages: [
      {
        content: {
          type: String,
          required: true
        },
        isUser: {
          type: Boolean,
          required: true
        },
        timestamp: {
          type: Date,
          default: Date.now
        },
        model: {
          type: String,
          enum: ["openai", "deepseek"],
          required: true
        }
      }
    ]
  },
  { timestamps: true }
);

// Index pour améliorer les performances des requêtes
AiChatHistorySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<IAiChatHistory>(
  "AiChatHistory",
  AiChatHistorySchema
);
