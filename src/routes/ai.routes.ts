import express from 'express';
import multer from 'multer';
import { handlePrompt } from '../controllers/aiChat.controller';
import { authenticateUser } from '../middlewares/authMiddleware';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Routes pour le chat IA et son historique
router.post(
  '/prompt',
  authenticateUser,
  upload.array('attachments'),
  handlePrompt,
);

export default router;
