import { Request, Response, NextFunction } from "express";
import UserLog from "../models/UserLog";

// Middleware pour tracker uniquement les utilisateurs connectés
export const trackUserActivity = async (req: Request, res: Response, next: NextFunction) => {
  // Désactiver le cache pour les requêtes API
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (!req.user) {
    return next();
  }

  try {
    await UserLog.create({
      userId: req.user.id,
      action: `${req.method} ${req.originalUrl}`,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"] ?? ""
    });
  } catch (error) {
    console.error("Erreur de tracking:", error);
  }

  next();
};
