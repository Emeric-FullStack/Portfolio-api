import express from "express";
import {
  signupUser,
  loginUser,
  getUserProfile,
  verifyToken,
  getAdminId,
  getUsersStatus
} from "../controllers/userController";
import { trackUserActivity } from "../middlewares/userTracker";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/verify-token", authenticateUser, trackUserActivity, verifyToken);
router.post("/signup", signupUser);
router.post("/login", loginUser);
router.get("/profile", authenticateUser, trackUserActivity, getUserProfile);
router.get("/admin-id", authenticateUser, getAdminId);
router.get("/status", authenticateUser, getUsersStatus);


export default router;
