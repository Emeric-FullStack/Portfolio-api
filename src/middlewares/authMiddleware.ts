import { Request, Response, NextFunction } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';
import { User } from '../models/User.model';

export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      res.status(401).json({ message: 'Token manquant' });
      return;
    }

    if (!process.env.JWT_SECRET) {
      res.status(500).json({ message: 'Configuration JWT manquante' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as JwtPayload;
    req.user = {
      _id: decoded.id,
      id: decoded.id,
      email: decoded.email,
      isAdmin: decoded.isAdmin,
    };

    await User.findByIdAndUpdate(decoded.id, { lastConnection: new Date() });
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide' });
  }
};

export const isMe = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.email === 'tourel.emeric@gmail.com') {
    next();
    return;
  }
  res.status(401).json({ message: 'Non autorisé' });
};
