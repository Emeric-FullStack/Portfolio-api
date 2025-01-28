import express from "express";
import multer from "multer";
import { handlePrompt } from "../controllers/aiController";
import { authenticateUser } from "../middlewares/authMiddleware";
import {
  saveChat,
  getChatHistory,
  deleteChat
} from "../controllers/aiHistoryController";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// Routes pour le chat IA et son historique
router.post(
  "/prompt",
  authenticateUser,
  upload.array("attachments"),
  handlePrompt
);
router.get("/history", authenticateUser, getChatHistory);
router.post("/history", authenticateUser, saveChat);
router.delete("/history/:id", authenticateUser, deleteChat);

export default router;
