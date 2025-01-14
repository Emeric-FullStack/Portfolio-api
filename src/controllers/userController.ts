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
  password: z.string().min(8).max(100),
  company: z.string().optional()
});

export const signupUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { firstName, lastName, email, password, company } = req.body;

    try {
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

      if (process.env.JWT_SECRET) {
        await newUser.save();
        const token = jwt.sign(
          { id: newUser._id, email: newUser.email },
          process.env.JWT_SECRET,
          { expiresIn: "1h" }
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
      } else {
        res.status(500).json({ message: "An error occurred" });
      }
    } catch (error) {
      console.error("Error during signup:", error);
      res.status(500).json({ message: "An error occurred", error });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res
        .status(400)
        .json({ message: "Invalid input data", errors: error.errors });
      return;
    }
    // ...
  }
};

export const loginUser = async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  try {
    if (process.env.JWT_SECRET) {
      const user = await User.findOne({ email });
      if (!user) {
        throw new AppError(404, "User not found");
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(400).json({ message: "Invalid credentials" });
        return;
      }

      const token = jwt.sign(
        { id: user._id, email: user.email },
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
            company: user.company
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
      throw new AppError(404, "User not found");
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

export const setOnlineStatus = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const { isOnline } = req.body;
    const user = await User.findByIdAndUpdate(
      userId,
      { isOnline },
      { new: true }
    );
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut." });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    res.status(200).json();
  } catch (error) {
    res.status(500).json({ error: "Erreur lors de la mise à jour du statut." });
  }
};
