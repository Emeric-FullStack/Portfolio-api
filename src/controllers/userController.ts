import { Request, RequestHandler, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../utils/errorHandler";
import { emailService } from "../services/emailService";
import Email from "../models/Email";

const userSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  company: z.string().optional()
});

const updateUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  company: z.string().optional()
});

export const signupUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { firstName, lastName, email, password, company } = validatedData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: "User already exists" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      company,
      isVerified: false
    });

    await newUser.save();

    try {
      const emailToken = await emailService.sendConfirmationEmail(email);
      console.log("Email de confirmation envoyé avec le token:", emailToken);
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
    }

    res.status(201).json({
      success: true,
      message:
        "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
      data: {
        email: newUser.email,
        needsEmailVerification: true
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Invalid input data",
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message
        }))
      });
      return;
    }
    console.error("Error during signup:", error);
    res.status(500).json({ message: "An error occurred", error });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    if (process.env.JWT_SECRET) {
      const user = await User.findOne({ email });

      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      if (!user.isVerified) {
        res.status(403).json({
          message: "Veuillez confirmer votre email avant de vous connecter",
          needsEmailVerification: true
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          isAdmin: user.isAdmin
        },
        process.env.JWT_SECRET,
        { expiresIn: "1h" }
      );

      res.status(200).json({
        data: {
          token,
          user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            company: user.company,
            isAdmin: user.isAdmin
          }
        }
      });
    } else {
      res.status(500).json({ message: "An error occurred" });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).json({ message: "An error occurred", error });
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company
      }
    });
  } catch (error) {
    res.status(500).json({ message: "An error occurred", error });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    await User.findByIdAndUpdate(req.user.id, {
      lastConnection: new Date()
    });

    if (user.isAdmin) {
      const users = await User.find(
        { isAdmin: false },
        { _id: 1, lastConnection: 1 }
      );

      const connectedUsers = users.map((u) => ({
        userId: u._id,
        online: u.lastConnection && u.lastConnection > tenMinutesAgo
      }));

      res.status(200).json({ users: connectedUsers });
    } else {
      const admin = await User.findOne(
        { isAdmin: true },
        { _id: 1, lastConnection: 1 }
      );

      if (!admin) {
        res.status(404).json({ message: "Admin not found" });
        return;
      }

      res.status(200).json({
        online: admin.lastConnection && admin.lastConnection > tenMinutesAgo
      });
    }
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut." });
  }
};

export const getAdminId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const admin = await User.findOne({
      email: "tourel.emeric@gmail.com",
      isAdmin: true
    }).select("_id");

    if (!admin) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    res.status(200).json({ adminId: admin._id });
  } catch (error) {
    res.status(500).json({ message: "Error fetching admin ID" });
  }
};

export const getUsersStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    if (req.user?.isAdmin) {
      const users = await User.find(
        { isAdmin: false },
        { _id: 1, lastConnection: 1 }
      );

      const statuses = users.map((user) => ({
        userId: user._id,
        online: user.lastConnection && user.lastConnection > tenMinutesAgo
      }));

      res.json({ users: statuses });
      return;
    }

    const admin = await User.findOne(
      { isAdmin: true },
      { _id: 1, lastConnection: 1 }
    );

    if (!admin) {
      res.status(404).json({ message: "Admin not found" });
      return;
    }

    res.json({
      online: admin.lastConnection && admin.lastConnection > tenMinutesAgo
    });
  } catch (error) {
    res.status(500).json({ message: "Error checking status" });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const validatedData = updateUserSchema.parse(req.body);
    const { firstName, lastName, email, company } = validatedData;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      res.status(400).json({ message: "Email already in use" });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        company
      },
      { new: true, select: "-password" }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    res.status(200).json({
      data: {
        user: {
          id: updatedUser._id,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          company: updatedUser.company,
          isAdmin: updatedUser.isAdmin
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: "Invalid input data",
        errors: error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message
        }))
      });
      return;
    }
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Error updating user" });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isPasswordValid) {
      res.status(400).json({ message: "Current password is incorrect" });
      return;
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ message: "Error updating password" });
  }
};

export const confirmEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const emailRecord = await Email.findOne({ token, type: "confirmation" });

    if (!emailRecord) {
      res.status(400).json({ message: "Token invalide ou expiré" });
      return;
    }

    // Mettre à jour le statut de vérification de l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { email: emailRecord.to },
      { isVerified: true },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({ message: "Utilisateur non trouvé" });
      return;
    }

    // Supprimer le token utilisé
    await Email.deleteOne({ _id: emailRecord._id });

    res.status(200).json({
      message: "Email confirmé avec succès",
      success: true
    });
  } catch (error) {
    console.error("Erreur lors de la confirmation de l'email:", error);
    res.status(500).json({
      message: "Erreur lors de la confirmation de l'email",
      success: false
    });
  }
};

export const resetPassword: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Aucun compte n'est associé à cette adresse email"
      });
      return;
    }

    await emailService.sendPasswordResetEmail(email);

    res.status(200).json({
      success: true,
      message: "Un email de réinitialisation a été envoyé"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de l'email de réinitialisation"
    });
  }
};

export const confirmResetPassword: RequestHandler = async (
  req,
  res
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    // Vérifier le token
    const emailRecord = await Email.findOne({
      token,
      type: "reset_password",
      isUsed: false,
      expiresAt: { $gt: new Date() }
    });

    if (!emailRecord) {
      res.status(400).json({
        success: false,
        message: "Token invalide ou expiré"
      });
      return;
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe de l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { email: emailRecord.to },
      { password: hashedPassword },
      { new: true }
    );

    if (!updatedUser) {
      res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé"
      });
      return;
    }

    // Marquer le token comme utilisé
    emailRecord.isUsed = true;
    await emailRecord.save();

    res.status(200).json({
      success: true,
      message: "Mot de passe réinitialisé avec succès"
    });
  } catch (error) {
    console.error("Confirm reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la réinitialisation du mot de passe"
    });
  }
};
