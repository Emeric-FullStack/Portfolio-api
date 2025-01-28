import { Request, Response } from "express";
import AiChatHistory from "../models/AiChatHistory";

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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [chats, total] = await Promise.all([
      AiChatHistory.find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AiChatHistory.countDocuments({ userId })
    ]);

    res.status(200).json({
      chats,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalChats: total
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
