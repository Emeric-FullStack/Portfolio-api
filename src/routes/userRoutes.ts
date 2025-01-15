import express from "express";
import {
  signupUser,
  loginUser,
  getUserProfile,
  setOnlineStatus,
  verifyToken,
  getAdminId
} from "../controllers/userController";
import { trackUserActivity } from "../middlewares/userTracker";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/verify-token", authenticateUser, trackUserActivity, verifyToken);
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/profile", authenticateUser, trackUserActivity, getUserProfile);
router.patch("/status", authenticateUser, trackUserActivity, setOnlineStatus);
router.get("/admin-id", authenticateUser, getAdminId);

export default router;
