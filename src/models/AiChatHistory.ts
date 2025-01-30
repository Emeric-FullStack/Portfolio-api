import mongoose, { Schema } from "mongoose";

const ConversationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  model: {
    type: String,
    enum: ["openai", "deepseek"],
    required: true
  },
  messages: [{
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
    }
  }]
}, {
  timestamps: true
});

export default mongoose.model("AiChatHistory", ConversationSchema);
