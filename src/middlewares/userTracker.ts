import { Request, Response, NextFunction } from "express";
import UserLog from "../models/UserLog";

// Middleware pour tracker uniquement les utilisateurs connectés
export const trackUserActivity = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    if (req.user) {
      const ipAddress =
        req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "";
      const userAgent = req.headers["user-agent"] ?? "";

      const log = new UserLog({
        userId: req.user.id, // Utilisateur connecté
        action: `${req.method} ${req.originalUrl}`, // Ex. : GET /dashboard
        ipAddress: ipAddress.toString(),
        userAgent
      });

      await log.save();
    }
  } catch (error) {
    console.error("Erreur lors du tracking utilisateur :", error);
  }

  next(); // Continuez le traitement
};
