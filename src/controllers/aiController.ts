import { RequestHandler, Response as ExpressResponse } from "express";
import { OpenAI } from "openai";
import axios from "axios";
import User from "../models/User";
import { decryptApiKey } from "../utils/encryption";
import { processAttachments } from "../utils/fileProcessor";
import AiChatHistory from "../models/AiChatHistory";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

const handleApiError = (error: any, model: string, res: ExpressResponse) => {
  if (error.status === 401 || error.error?.code === "invalid_api_key") {
    res.status(401).json({ message: `Clé API ${model} invalide` });
  } else if (error.status === 429) {
    res.status(429).json({ message: `Quota ${model} dépassé` });
  } else if (
    error.status === 402 ||
    error.error?.code === "insufficient_quota"
  ) {
    res
      .status(402)
      .json({ message: `Veuillez créditer votre compte ${model}` });
  } else {
    throw error;
  }
};

const handleOpenAIPrompt = async (apiKey: string, content: string) => {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [{ role: "user", content }]
  });
  return completion.choices[0].message.content;
};

const handleDeepseekPrompt = async (apiKey: string, content: string) => {
  const { data } = await axios.post(
    DEEPSEEK_API_URL,
    {
      messages: [{ role: "user", content }],
      model: "deepseek-chat"
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      }
    }
  );
  return data.choices[0].message.content;
};

export const handlePrompt: RequestHandler = async (req, res): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { content, model, conversationId } = req.body;
    const files = req.files as Express.Multer.File[];

    console.log("Processing request for model:", model);

    const user = await User.findById(userId).select(
      "+apiKeys.openai +apiKeys.deepseek"
    );
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    const processedContent = files?.length
      ? `${content}\n\nContenu des fichiers:\n${await processAttachments(
          files
        )}`
      : content;

    try {
      const apiKey = await decryptApiKey(
        user.apiKeys[model as keyof typeof user.apiKeys]
      );
      const response =
        model === "openai"
          ? await handleOpenAIPrompt(apiKey, processedContent)
          : await handleDeepseekPrompt(apiKey, processedContent);

      // Chercher une conversation existante ou en créer une nouvelle
      let chatHistory;
      if (conversationId) {
        chatHistory = await AiChatHistory.findById(conversationId);
      }

      if (!chatHistory) {
        chatHistory = new AiChatHistory({
          userId,
          model,
          messages: []
        });
      }

      // Ajouter les nouveaux messages
      chatHistory.messages.push(
        {
          content,
          isUser: true,
          timestamp: new Date(),
          model
        },
        {
          content: response,
          isUser: false,
          timestamp: new Date(),
          model
        }
      );

      await chatHistory.save();
      res.json({
        content: response,
        conversationId: chatHistory._id
      });
    } catch (error: any) {
      handleApiError(error, model, res);
    }
  } catch (error: any) {
    console.error("AI Error full details:", error);
    res.status(500).json({
      message: "Une erreur est survenue lors de la génération de la réponse",
      details: error.message
    });
  }
};
