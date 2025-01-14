import { Request, Response } from "express";
import Article from "../models/Article";
import User from "../models/User";
import cloudinary from "../config/cloudinaryConfig";
const mongoose = require("mongoose");
import multer from "multer";

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/^image\/(jpeg|png|gif)$/)) {
      cb(new Error("Only image files are allowed!"));
      return;
    }
    cb(null, true);
  }
});

export const getArticles = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const articles = await Article.find();

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const articlesWithLikeStatus = articles.map((article) => ({
      ...article.toObject(),
      isLiked: user.articles_liked.some(
        (likedArticleId) => likedArticleId.toString() === article._id.toString()
      )
    }));

    res.status(200).json(articlesWithLikeStatus);
  } catch (error) {
    console.error("Erreur lors de la récupération des articles :", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const createArticle = [
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      const {
        title,
        summary,
        source,
        content,
        tags,
        readingTime,
        external_link
      } = req.body;
      let uploadedImageUrl = null;

      if (req.file) {
        const base64Image = req.file.buffer.toString("base64");
        const dataUri = `data:${req.file.mimetype};base64,${base64Image}`;

        const uploadResponse = await cloudinary.uploader.upload(dataUri, {
          folder: "articles",
          resource_type: "image"
        });
        uploadedImageUrl = uploadResponse.secure_url;
      }

      const newArticle = new Article({
        title,
        summary,
        image: uploadedImageUrl,
        source,
        content,
        tags,
        readingTime,
        external_link
      });

      const savedArticle = await newArticle.save();
      res.status(201).json(savedArticle);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
];

export const updateArticle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedArticle = await Article.findByIdAndUpdate(id, req.body, {
      new: true
    });

    if (!updatedArticle) {
      res.status(404).json({ message: "Article non trouvé." });
      return;
    }

    res.json(updatedArticle);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteArticle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedArticle = await Article.findByIdAndDelete(id);

    if (!deletedArticle) {
      res.status(404).json({ message: "Article non trouvé." });
      return;
    }

    res.status(204).send();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getTags = async (req: Request, res: Response) => {
  try {
    const tags = await Article.distinct("tags");
    res.json(tags);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const likeArticle = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const articleId = new mongoose.Types.ObjectId(req.params.id);
    if (!articleId) {
      res.status(400).json({ message: "Article ID is required" });
      return;
    }

    const user = await User.findById(userId);
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const isLiked = user.articles_liked.includes(articleId);

    if (isLiked) {
      await User.findByIdAndUpdate(
        userId,
        { $pull: { articles_liked: articleId } },
        { new: true }
      );
    } else {
      await User.findByIdAndUpdate(
        userId,
        { $addToSet: { articles_liked: articleId } },
        { new: true }
      );
    }

    await user.save();

    res.status(200).json({
      message: `Article has been ${isLiked ? "unliked" : "liked"}`,
      isLiked: !isLiked
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
