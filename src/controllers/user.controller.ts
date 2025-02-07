import { Request, RequestHandler, Response } from 'express';
import { User } from '../models/User.model';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { emailService } from '../services/emailService';
import Email from '../models/Email.model';
import { decryptApiKey, encryptApiKey } from '../utils/encryption';

const userSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
  company: z.string().optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  company: z.string().optional(),
});

export const signupUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { firstName, lastName, email, password, company } = validatedData;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'User already exists' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      company,
      isVerified: false,
    });

    await newUser.save();

    try {
      const emailToken = await emailService.sendConfirmationEmail(email);
    } catch (emailError) {
      console.error("Erreur lors de l'envoi de l'email:", emailError);
    }

    res.status(201).json({
      success: true,
      message:
        'Inscription réussie. Veuillez vérifier votre email pour activer votre compte.',
      data: {
        email: newUser.email,
        needsEmailVerification: true,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Invalid input data',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    console.error('Error during signup:', error);
    res.status(500).json({ message: 'An error occurred', error });
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    if (process.env.JWT_SECRET) {
      const user = await User.findOne({ email });

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      if (!user.isVerified) {
        res.status(403).json({
          message: 'Veuillez confirmer votre email avant de vous connecter',
          needsEmailVerification: true,
        });
        return;
      }

      // Mettre à jour le statut en ligne
      user.isOnline = true;
      user.lastConnection = new Date();
      await user.save();

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          isAdmin: user.isAdmin,
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' },
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
            isAdmin: user.isAdmin,
          },
        },
      });
    } else {
      res.status(500).json({ message: 'An error occurred' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ message: 'An error occurred', error });
  }
};

export const getUserProfile = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.status(200).json({
      data: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        company: user.company,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'An error occurred', error });
  }
};

export const verifyToken: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Récupérer le statut de l'admin
    const admin = await User.findOne(
      { isAdmin: true },
      'isOnline lastConnection',
    ).lean();

    // Vérifier si l'admin est actif dans les 5 dernières minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isAdminOnline =
      admin?.isOnline &&
      admin.lastConnection &&
      admin.lastConnection > fiveMinutesAgo;

    // Mise à jour de la dernière connexion
    await User.findByIdAndUpdate(req.user.id, {
      lastConnection: new Date(),
    });

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        isAdmin: user.isAdmin,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      isAdminOnline,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la vérification du token.' });
  }
};

export const getAdminId = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const admin = await User.findOne({
      email: 'tourel.emeric@gmail.com',
      isAdmin: true,
    }).select('_id');

    if (!admin) {
      res.status(404).json({ message: 'Admin not found' });
      return;
    }

    res.status(200).json({ adminId: admin._id });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching admin ID' });
  }
};

export const getUsersStatus: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    // Pour les utilisateurs non-admin, renvoyer uniquement le statut de l'admin
    const admin = await User.findOne(
      { isAdmin: true },
      'firstName lastName isOnline lastConnection',
    ).lean();

    // Vérifier si l'admin est actif dans les 5 dernières minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const isActive =
      admin?.lastConnection && admin.lastConnection > fiveMinutesAgo;

    res.json({
      _id: admin?._id,
      firstName: admin?.firstName,
      lastName: admin?.lastName,
      isOnline: admin?.isOnline && isActive,
      lastConnection: admin?.lastConnection,
    });
  } catch (error) {
    console.error('Error getting users status:', error);
    res.status(500).json({ message: 'Error retrieving users status' });
  }
};

export const updateUser = async (req: Request, res: Response) => {
  try {
    const validatedData = updateUserSchema.parse(req.body);
    const { firstName, lastName, email, company } = validatedData;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const existingUser = await User.findOne({ email, _id: { $ne: userId } });
    if (existingUser) {
      res.status(400).json({ message: 'Email already in use' });
      return;
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        firstName,
        lastName,
        email,
        company,
      },
      { new: true, select: '-password' },
    );

    if (!updatedUser) {
      res.status(404).json({ message: 'User not found' });
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
          isAdmin: updatedUser.isAdmin,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        message: 'Invalid input data',
        errors: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user' });
  }
};

export const updatePassword = async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      res.status(400).json({ message: 'Current password is incorrect' });
      return;
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Mettre à jour le mot de passe
    await User.findByIdAndUpdate(userId, { password: hashedPassword });

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: 'Error updating password' });
  }
};

export const confirmEmail = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    const emailRecord = await Email.findOne({ token, type: 'confirmation' });

    if (!emailRecord) {
      res.status(400).json({ message: 'Token invalide ou expiré' });
      return;
    }

    // Mettre à jour le statut de vérification de l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { email: emailRecord.to },
      { isVerified: true },
      { new: true },
    );

    if (!updatedUser) {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }

    // Supprimer le token utilisé
    await Email.deleteOne({ _id: emailRecord._id });

    res.status(200).json({
      message: 'Email confirmé avec succès',
      success: true,
    });
  } catch (error) {
    console.error("Erreur lors de la confirmation de l'email:", error);
    res.status(500).json({
      message: "Erreur lors de la confirmation de l'email",
      success: false,
    });
  }
};

export const resetPassword: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      res.status(404).json({
        success: false,
        message: "Aucun compte n'est associé à cette adresse email",
      });
      return;
    }

    await emailService.sendPasswordResetEmail(email);

    res.status(200).json({
      success: true,
      message: 'Un email de réinitialisation a été envoyé',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de l'envoi de l'email de réinitialisation",
    });
  }
};

export const confirmResetPassword: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      res.status(400).json({ message: 'Token invalide ou expiré' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Mot de passe modifié avec succès' });
    return;
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res
      .status(500)
      .json({ message: 'Erreur lors de la réinitialisation du mot de passe' });
    return;
  }
};

export const getApiKeys = async (req: Request, res: Response) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId).select(
      '+apiKeys.openai +apiKeys.deepseek',
    );
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Décrypter les clés avant de les envoyer
    const openaiKey = user.apiKeys?.openai
      ? await decryptApiKey(user.apiKeys.openai)
      : null;
    const deepseekKey = user.apiKeys?.deepseek
      ? await decryptApiKey(user.apiKeys.deepseek)
      : null;

    res.status(200).json({
      openai: openaiKey,
      deepseek: deepseekKey,
    });
  } catch (error) {
    console.error('Error getting API keys:', error);
    res.status(500).json({ message: 'Error retrieving API keys' });
  }
};

export const updateApiKeys = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?._id;
    const { openai, deepseek } = req.body;

    const updates: { [key: string]: string } = {};

    if (openai) {
      updates['apiKeys.openai'] = encryptApiKey(openai);
    }
    if (deepseek) {
      updates['apiKeys.deepseek'] = encryptApiKey(deepseek);
    }

    await User.findByIdAndUpdate(userId, { $set: updates });

    res.status(200).json({ message: 'API keys updated successfully' });
    return;
  } catch (error) {
    console.error('Error updating API keys:', error);
    res.status(500).json({ message: 'Error updating API keys' });
    return;
  }
};

export const deleteApiKey = async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const userId = req.user?._id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    await User.findByIdAndUpdate(
      userId,
      { apiKeys: { [provider]: null } },
      { new: true },
    );
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ message: 'Error deleting API key' });
    return;
  }
};

export const checkApiKeys = async (
  req: Request,
  res: Response,
): Promise<void> => {
  // Ajout des headers no-cache
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    const userId = req.user?._id;
    const user = await User.findById(userId).select(
      '+apiKeys.openai +apiKeys.deepseek',
    );

    if (!user) {
      res.status(404).json({ message: 'Utilisateur non trouvé' });
      return;
    }

    res.json({
      openai: !!user.apiKeys?.openai,
      deepseek: !!user.apiKeys?.deepseek,
    });
    return;
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur' });
    return;
  }
};

// Ajouter une méthode pour la déconnexion
export const logoutUser: RequestHandler = async (req, res): Promise<void> => {
  try {
    if (req.user?._id) {
      const user = await User.findById(req.user._id);

      // Si c'est l'admin qui se déconnecte
      if (user?.isAdmin) {
        await User.findByIdAndUpdate(req.user._id, {
          isOnline: false,
          lastConnection: new Date(),
        });
      }
    }
    res.json({ message: 'Déconnecté avec succès' });
  } catch (error) {
    console.error('Erreur lors de la déconnexion:', error);
    res.status(500).json({ message: 'Erreur lors de la déconnexion' });
  }
};

export const updateUserStatus: RequestHandler = async (
  req,
  res,
): Promise<void> => {
  try {
    const { isOnline } = req.body;

    if (req.user?._id) {
      await User.findByIdAndUpdate(req.user._id, {
        isOnline,
        lastConnection: new Date(),
      });
    }
    res.json({ message: 'Statut mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res
      .status(500)
      .json({ message: 'Erreur lors de la mise à jour du statut' });
  }
};
