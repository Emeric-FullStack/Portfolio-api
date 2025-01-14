// controllers/messageController.ts
import { Request, Response, NextFunction } from "express";
import Message from "../models/Message";
import xss from "xss";

export const createMessage = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const content = xss(req.body.content);
    if (!content || content.length > 1000) {
      res.status(400).json({ message: "Invalid message content" });
      return;
    }

    const sender = req.user.id;
    const message = new Message({ content, sender });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Erreur lors de la création du message." });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const messages = await Message.find();
    res.status(200).json(messages);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur lors de la récupération des messages." });
  }
};

export const updateMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const updatedMessage = await Message.findByIdAndUpdate(
      id,
      { content },
      { new: true }
    );
    res.status(200).json(updatedMessage);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur lors de la mise à jour du message." });
  }
};

export const deleteMessage = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await Message.findByIdAndDelete(id);
    res.status(204).send();
  } catch (error) {
    res
      .status(500)
      .json({ error: "Erreur lors de la suppression du message." });
  }
};

export const getContactsWithMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const messages = await Message.aggregate([
      // Filtrer les messages où le champ `sender` existe
      {
        $match: {
          sender: { $exists: true }
        }
      },
      // Grouper par `sender` pour regrouper les messages par utilisateur
      {
        $group: {
          _id: "$sender", // Grouper par l'ID du sender
          messages: {
            $push: {
              content: "$content",
              createdAt: "$createdAt"
            }
          }, // Collecter tous les messages associés
          lastMessage: { $first: "$content" }, // Dernier message envoyé
          lastMessageDate: { $first: "$createdAt" } // Date du dernier message
        }
      },
      // Joindre avec la collection `users` pour récupérer les infos de l'utilisateur
      {
        $lookup: {
          from: "users", // Nom de la collection `users`
          localField: "_id", // Correspond au sender
          foreignField: "_id", // Correspond au champ `_id` dans `users`
          as: "userInfo" // Champ contenant les informations utilisateur
        }
      },
      // Déstructurer `userInfo` pour inclure les infos utilisateur
      {
        $unwind: {
          path: "$userInfo",
          preserveNullAndEmptyArrays: true
        }
      },
      // Trier les résultats par date du dernier message
      {
        $sort: { lastMessageDate: -1 }
      }
    ]);

    res.json(messages);
  } catch (error) {
    console.error("Erreur lors de la récupération des contacts :", error);
    next(error);
  }
};
