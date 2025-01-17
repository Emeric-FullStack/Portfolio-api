// routes/messageRoutes.ts
import express from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import {
  getMessagesWithAdmin,
  sendMessage,
  getMessages,
  getConversations,
  markAsRead
} from "../controllers/messageController";

const router = express.Router();

router.post("/", authenticateUser, sendMessage);
router.get("/conversations", authenticateUser, getConversations);
router.get("/admin", authenticateUser, getMessagesWithAdmin);
router.get("/:userId", authenticateUser, getMessages);
router.patch("/read/:conversationId", authenticateUser, markAsRead);

export default router;
