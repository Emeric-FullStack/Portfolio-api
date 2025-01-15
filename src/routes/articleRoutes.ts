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
import { query } from "express-validator";

const router = Router();

router.get(
  "/",
  authenticateUser,
  [
    query("page").optional().isInt({ min: 1 }).toInt(),
    query("limit").optional().isInt({ min: 1, max: 50 }).toInt(),
    query("tags").optional().isString()
  ],
  getArticles
);
router.post("/", authenticateUser, isMe, createArticle);
router.put("/:id", authenticateUser, isMe, updateArticle);
router.delete("/:id", authenticateUser, isMe, deleteArticle);
router.get("/tags", authenticateUser, getTags);
router.post("/like/:id", authenticateUser, likeArticle);

export default router;
