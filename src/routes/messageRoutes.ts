// routes/messageRoutes.ts
import { Router } from "express";
import {
  createMessage,
  getMessages,
  updateMessage,
  deleteMessage,
  getContactsWithMessages
} from "../controllers/messageController";
import { authenticateUser, isMe } from "../middlewares/authMiddleware";
import { trackUserActivity } from "../middlewares/userTracker";

const router = Router();

router.post("/", authenticateUser, trackUserActivity, createMessage);
router.get("/", authenticateUser, isMe, trackUserActivity, getMessages);
router.put("/:id", authenticateUser, trackUserActivity, updateMessage);
router.delete("/:id", authenticateUser, trackUserActivity, deleteMessage);
router.get("/contacts", authenticateUser, isMe, getContactsWithMessages);

export default router;
