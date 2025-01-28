import express from "express";
import { authenticateUser } from "../middlewares/authMiddleware";
import {
  saveChat,
  getChatHistory,
  deleteChat
} from "../controllers/aiHistoryController";

const router = express.Router();

router.post("/", authenticateUser, saveChat);
router.get("/", authenticateUser, getChatHistory);
router.delete("/:id", authenticateUser, deleteChat);

export default router;
