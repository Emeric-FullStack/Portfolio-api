import { Request, Response, NextFunction } from "express";
import UserLog from "../models/UserLog";

// Middleware pour tracker uniquement les utilisateurs connectés
export const trackUserActivity = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  try {
    await UserLog.create({
      userId: req.user.id,
      action: `${req.method} ${req.originalUrl}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] || ""
    });
  } catch (error) {
    console.error("Erreur de tracking:", error);
  }

  next();
};
