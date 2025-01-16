import { Request, Response } from "express";
import User from "../models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { AppError } from "../utils/errorHandler";

const userSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6).max(100),
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
      company
    });

    if (!process.env.JWT_SECRET) {
      res.status(500).json({ message: "JWT Secret is not configured" });
      return;
    }

    await newUser.save();
    const token = jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "10h" }
    );

    res.status(201).json({
      data: {
        token,
        user: {
          id: newUser._id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          company: newUser.company
        }
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log("Validation error:", error.errors);
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
