// controllers/messageController.ts
import { Request, Response } from "express";
import Message, { IMessagePopulated } from "../models/Message";
import User from "../models/User";
import mongoose, { Types } from "mongoose";

interface ConversationAggregation {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  lastMessage: string;
  unreadCount: number;
  timestamp: Date;
}

export const sendMessage = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { content, receiverId } = req.body;
    const senderId = req.user?.id;

    const sanitizedContent = content
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "'");

    let finalReceiverId = receiverId;
    if (receiverId === "admin") {
      const adminUser = await User.findOne({
        email: "tourel.emeric@gmail.com"
      });
      if (!adminUser) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }
      finalReceiverId = adminUser._id;
    }

    const newMessage = new Message({
      content: sanitizedContent,
      sender: senderId,
      receiver: finalReceiverId,
      read: false,
      createdAt: new Date()
    });

    const savedMessage = await newMessage.save();
    const populatedMessage = await Message.findById(savedMessage._id)
      .populate("sender", "firstName lastName email _id")
      .populate("receiver", "firstName lastName email _id")
      .lean();

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message" });
  }
};

export const getMessagesWithAdmin = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user?.id);
    const adminUser = await User.findOne({ email: "tourel.emeric@gmail.com" });

    if (!adminUser) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    const messages = await Message.find({
      $or: [
        { sender: userId, receiver: adminUser._id },
        { sender: adminUser._id, receiver: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("sender", "firstName lastName email")
      .populate("receiver", "firstName lastName email")
      .lean<IMessagePopulated[]>();

    const formattedMessages = messages.map((msg: any) => ({
      _id: msg._id.toString(),
      content: msg.content,
      sender: {
        _id: msg.sender._id.toString(),
        firstName: msg.sender.firstName,
        lastName: msg.sender.lastName,
        email: msg.sender.email
      },
      receiver: {
        _id: msg.receiver._id.toString(),
        firstName: msg.receiver.firstName,
        lastName: msg.receiver.lastName,
        email: msg.receiver.email
      },
      createdAt: msg.createdAt,
      read: msg.read
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ message: "Error retrieving messages" });
  }
};

export const getMessages = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    const withUserId = req.params.userId;

    const messages = await Message.find({
      $or: [
        {
          sender: new mongoose.Types.ObjectId(userId),
          receiver: new mongoose.Types.ObjectId(withUserId)
        },
        {
          sender: new mongoose.Types.ObjectId(withUserId),
          receiver: new mongoose.Types.ObjectId(userId)
        }
      ]
    })
      .sort({ createdAt: 1 })
      .populate("sender", "firstName lastName email")
      .populate("receiver", "firstName lastName email")
      .lean<IMessagePopulated[]>();

    const formattedMessages = messages.map((msg: any) => ({
      _id: msg._id.toString(),
      content: msg.content,
      sender: {
        _id: msg.sender._id.toString(),
        firstName: msg.sender.firstName,
        lastName: msg.sender.lastName,
        email: msg.sender.email
      },
      receiver: {
        _id: msg.receiver._id.toString(),
        firstName: msg.receiver.firstName,
        lastName: msg.receiver.lastName,
        email: msg.receiver.email
      },
      createdAt: msg.createdAt,
      read: msg.read
    }));

    res.status(200).json(formattedMessages);
  } catch (error) {
    console.error("Error retrieving messages:", error);
    res.status(500).json({ message: "Error retrieving messages" });
  }
};

export const getConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    const conversations = await Message.aggregate<ConversationAggregation>([
      // Trouver tous les messages impliquant l'utilisateur
      {
        $match: {
          $or: [
            { sender: new mongoose.Types.ObjectId(userId) },
            { receiver: new mongoose.Types.ObjectId(userId) }
          ]
        }
      },
      // Trier par date décroissante
      {
        $sort: { createdAt: -1 }
      },
      // Grouper par conversation
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ["$sender", new mongoose.Types.ObjectId(userId)] },
              then: "$receiver",
              else: "$sender"
            }
          },
          lastMessage: { $first: "$$ROOT" },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$receiver", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$read", false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      // Joindre les infos utilisateur
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      {
        $unwind: "$userDetails"
      },
      // Projeter le résultat final
      {
        $project: {
          _id: "$userDetails._id",
          firstName: "$userDetails.firstName",
          lastName: "$userDetails.lastName",
          email: "$userDetails.email",
          lastMessage: "$lastMessage.content",
          unreadCount: 1,
          timestamp: "$lastMessage.createdAt"
        }
      },
      // Trier par dernier message
      {
        $sort: { timestamp: -1 }
      }
    ]);

    res.status(200).json(conversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ message: "Error retrieving conversations" });
  }
};

export const markAsRead = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const userId = req.user?.id;

    await Message.updateMany(
      {
        sender: conversationId,
        receiver: userId,
        read: false
      },
      { read: true }
    );

    res.status(200).json({ message: "Messages marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Error marking messages as read" });
  }
};
