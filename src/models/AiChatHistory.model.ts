import mongoose, { Schema } from "mongoose";

const ConversationSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    default: function () {
      return `Conversation du ${new Date().toLocaleDateString('fr-FR')}`;
    }
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
  }],
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware pour mettre à jour lastUpdated
ConversationSchema.pre('save', function (next) {
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model("AiChatHistory", ConversationSchema);
