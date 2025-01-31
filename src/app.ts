import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import userRoutes from "./routes/userRoutes";
import messageRoutes from "./routes/messageRoutes";
import articleRoutes from "./routes/articleRoutes";
import { loggerMiddleware } from "./middlewares/loggerMiddleware";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { handleError } from "./utils/errorHandler";
import aiRoutes from "./routes/aiRoutes";
import aiHistoryRoutes from "./routes/aiHistoryRoutes";

dotenv.config();

const app = express();

// Sécurité d'abord
app.use(helmet());
app.use(cors());

// Séparer les limiteurs pour différentes routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requêtes par IP
  message: "Trop de tentatives de connexion, veuillez réessayer plus tard"
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requêtes par IP
  message: "Trop de requêtes API, veuillez réessayer plus tard"
});

// Appliquer les limiteurs spécifiquement
app.use("/api/users/login", authLimiter);
app.use("/api/users/signup", authLimiter);
app.use("/api", apiLimiter); // Limiteur général pour les autres routes

// Middlewares standards
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(loggerMiddleware);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/ai/history", aiHistoryRoutes);

// Route de test simple
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Gestion des erreurs
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  handleError(err, res);
});

export default app;
