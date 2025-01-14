import { Router } from "express";
import {
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  getTags,
  likeArticle
} from "../controllers/articleController";
import { authenticateUser, isMe } from "../middlewares/authMiddleware";

const router = Router();

router.get("/", authenticateUser, getArticles);
router.post("/", authenticateUser, isMe, createArticle);
router.put("/:id", authenticateUser, isMe, updateArticle);
router.delete("/:id", authenticateUser, isMe, deleteArticle);
router.get("/tags", authenticateUser, getTags);
router.post("/like/:id", authenticateUser, likeArticle);

export default router;
