import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import User from "../models/User";

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      res.status(401).json({ message: "No token provided" });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({ message: "JWT Secret is not configured" });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin
    };
    await User.findByIdAndUpdate(decoded.id, {
      lastConnection: new Date()
    });

    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

export const isMe = (req: Request, res: Response, next: NextFunction) => {
  if (req.user) {
    if (req.user.email === "tourel.emeric@gmail.com") {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } else {
    res.status(401).json({ message: "Unauthorized" });
  }
};
