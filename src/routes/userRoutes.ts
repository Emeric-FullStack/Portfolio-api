import express from "express";
import {
  signupUser,
  loginUser,
  verifyToken,
  updateUser,
  getUsersStatus,
  confirmEmail,
  resetPassword,
  confirmResetPassword,
  updatePassword,
  getUserProfile,
  getApiKeys,
  updateApiKeys,
  deleteApiKey,
  checkApiKeys
} from "../controllers/userController";
import { authenticateUser } from "../middlewares/authMiddleware";
import { trackUserActivity } from "../middlewares/userTracker";

const router = express.Router();

// Routes d'authentification
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/verify-token", authenticateUser, verifyToken);
router.post("/confirm-email", confirmEmail);
router.get("/profile", authenticateUser, trackUserActivity, getUserProfile);

// Routes de gestion du compte
router.get("/me", authenticateUser);
router.put("/update", authenticateUser, updateUser);
router.put("/update-password", authenticateUser, updatePassword);
router.get("/status", authenticateUser, getUsersStatus);

// Routes de réinitialisation du mot de passe
router.post("/reset-password", resetPassword);
router.post("/reset-password/confirm", confirmResetPassword);

// Routes de gestion des clés API
router.get("/api-keys", authenticateUser, getApiKeys);
router.get("/api-keys/check", authenticateUser, checkApiKeys);
router.put("/api-keys", authenticateUser, updateApiKeys);
router.delete("/api-key/:provider", authenticateUser, deleteApiKey);
export default router;
