import express from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import {
  saveChat,
  getChatHistory,
  deleteChat,
  getConversations,
  getConversation
} from "../controllers/aiHistoryController";

const router = express.Router();

router.post("/", authenticateUser, saveChat);
router.get("/", authenticateUser, getChatHistory);
router.delete("/conversations/:id", authenticateUser, deleteChat);
router.get("/conversations", authenticateUser, getConversations);
router.get("/conversations/:id", authenticateUser, getConversation);

export default router;
