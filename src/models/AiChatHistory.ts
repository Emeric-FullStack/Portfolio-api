import mongoose, { Schema } from "mongoose";

const AiChatHistorySchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  messages: [{
    content: { type: String, required: true },
    isUser: { type: Boolean, required: true },
    timestamp: { type: Date, default: Date.now },
    model: {
      type: String,
      enum: ["openai", "deepseek"],
      required: true
    }
  }]
}, { 
  timestamps: true,
  index: { userId: 1, createdAt: -1 }
});

export default mongoose.model("AiChatHistory", AiChatHistorySchema);
