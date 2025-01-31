import { RequestHandler, Response as ExpressResponse } from "express";
import { OpenAI } from "openai";
import axios from "axios";
import User from "../models/User.model";
import { decryptApiKey } from "../utils/encryption";
import { processAttachments } from "../utils/fileProcessor";
import AiChatHistory from "../models/AiChatHistory.model";
import { ChatCompletionMessageParam } from "openai/resources/chat";

const DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const handleApiError = (error: any, model: string, res: ExpressResponse) => {
  console.error(`${model} API Error:`, error);

  // OpenAI specific errors
  if (error.response?.data?.error) {
    const apiError = error.response.data.error;
    if (apiError.code === 'invalid_api_key') {
      return res.status(401).json({ message: `Clé API ${model} invalide` });
    }
    if (apiError.code === 'insufficient_quota') {
      return res.status(402).json({ message: `Quota ${model} dépassé` });
    }
    return res.status(400).json({ message: apiError.message });
  }

  // Deepseek specific errors
  if (error.response?.status === 401) {
    return res.status(401).json({ message: `Clé API ${model} invalide` });
  }
  if (error.response?.status === 429) {
    return res.status(429).json({ message: `Quota ${model} dépassé` });
  }

  throw error;
};

const handleOpenAIPrompt = async (apiKey: string, messages: Array<{ role: "user" | "assistant" | "system", content: string }>) => {
  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "Tu es un assistant spécialisé dans la génération de code propre et bien formaté. Tu as accès à l'historique complet de la conversation et tu dois l'utiliser pour maintenir le contexte. Format des réponses : utiliser des blocs Markdown(```language\\ncode```) pour le code et '```plaintext' pour le texte."
      },
      ...messages as ChatCompletionMessageParam[]
    ]
  });
  return completion.choices[0].message.content;
};

const handleDeepseekPrompt = async (apiKey: string, messages: Array<{ role: "user" | "assistant" | "system", content: string }>) => {
  // Deepseek n'accepte que les rôles "user" et "assistant"
  const filteredMessages = messages.filter(msg => msg.role !== "system");

  const { data } = await axios.post(
    DEEPSEEK_API_URL,
    {
      messages: filteredMessages,
      model: "deepseek-chat",
      temperature: 0.7,
      max_tokens: 2000
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
  const { model } = req.body as { model: 'openai' | 'deepseek' };
  try {
    const userId = req.user?._id;
    const { content, conversationId } = req.body as {
      content: string;
      conversationId?: string
    };
    const files = req.files as Express.Multer.File[];

    // Traiter le contenu avec les fichiers
    const processedContent = files?.length
      ? `${content}\n\nContenu des fichiers:\n${await processAttachments(files)}`
      : content;

    // Récupérer l'historique
    let conversation;
    let messageHistory: ChatMessage[] = [];

    // Récupérer l'utilisateur
    const user = await User.findById(userId).select("+apiKeys.openai +apiKeys.deepseek");
    if (!user) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    if (conversationId) {
      conversation = await AiChatHistory.findOne({ _id: conversationId, userId });
      if (conversation) {
        messageHistory = conversation.messages.map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.content
        }));
      }
    }

    // Ajouter le nouveau message avec le contenu traité
    messageHistory.push({ role: 'user', content: processedContent });

    const apiKey = await decryptApiKey(user.apiKeys[model]);
    const response = model === "openai"
      ? await handleOpenAIPrompt(apiKey, messageHistory)
      : await handleDeepseekPrompt(apiKey, messageHistory);

    // Sauvegarder dans la conversation
    if (!conversation) {
      // Extraire la première phrase du contenu (jusqu'au premier point ou retour à la ligne)
      const title = processedContent.split(/[.?\n]/)[0].trim();

      conversation = new AiChatHistory({
        userId,
        model,
        title: title.length > 50 ? title.substring(0, 50) + '...' : title,
        messages: [
          { content: processedContent, isUser: true },
          { content: response, isUser: false }
        ]
      });
    } else {
      conversation.messages.push(
        { content: processedContent, isUser: true },
        { content: response, isUser: false }
      );
    }
    await conversation.save();

    res.json({
      content: response,
      conversationId: conversation._id
    });
  } catch (error: any) {
    handleApiError(error, model, res);
  }
};
