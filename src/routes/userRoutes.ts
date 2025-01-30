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

// Routes publiques
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/confirm-email", confirmEmail);
router.post("/reset-password", resetPassword);
router.post("/reset-password/confirm", confirmResetPassword);

// Routes authentifiées
router.use(authenticateUser);

// Routes de profil
router.get("/profile", trackUserActivity, getUserProfile);
router.put("/update", updateUser);
router.put("/update-password", updatePassword);

// Routes de statut
router.get("/verify-token", verifyToken);
router.get("/status", getUsersStatus);

// Routes API keys
router.get("/api-keys", getApiKeys);
router.get("/api-keys/check", checkApiKeys);
router.put("/api-keys", updateApiKeys);
router.delete("/api-key/:provider", deleteApiKey);

export default router;
