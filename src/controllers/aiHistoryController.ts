import { Request, Response } from "express";
import AiChatHistory from "../models/AiChatHistory.model";

export const saveChat = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { messages } = req.body;

    const chatHistory = new AiChatHistory({
      userId,
      messages
    });

    await chatHistory.save();
    res.status(201).json({ message: "Chat history saved successfully" });
  } catch (error) {
    console.error("Error saving chat history:", error);
    res.status(500).json({ message: "Error saving chat history" });
  }
};

export const getChatHistory = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;

    const chats = await Promise.all([
      AiChatHistory.find({ userId })
        .sort({ createdAt: -1 }),
      AiChatHistory.countDocuments({ userId })
    ]);

    res.status(200).json({
      chats
    });
  } catch (error) {
    console.error("Error retrieving chat history:", error);
    res.status(500).json({ message: "Error retrieving chat history" });
  }
};

export const deleteChat = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const chatId = req.params.id;

    const chat = await AiChatHistory.findOneAndDelete({
      _id: chatId,
      userId
    });

    if (!chat) {
      res.status(404).json({ message: "Chat history not found" });
      return;
    }

    res.status(200).json({ message: "Chat history deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat history:", error);
    res.status(500).json({ message: "Error deleting chat history" });
  }
};

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    console.log("userId", userId);
    const conversations = await AiChatHistory.find({ userId });
    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error retrieving conversations:", error);
    res.status(500).json({ message: "Error retrieving conversations" });
  }
};

export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?._id;
    const conversationId = req.params.id;
    const conversation = await AiChatHistory.findOne({ _id: conversationId, userId });
    res.status(200).json(conversation);
  } catch (error) {
    console.error("Error retrieving conversation:", error);
    res.status(500).json({ message: "Error retrieving conversation" });
  }
};
