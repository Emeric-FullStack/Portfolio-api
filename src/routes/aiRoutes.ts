import express from "express";
import multer from "multer";
import { handlePrompt } from "../controllers/aiController";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post(
  "/prompt",
  authenticateUser,
  upload.array("attachments"),
  handlePrompt
);

export default router;
