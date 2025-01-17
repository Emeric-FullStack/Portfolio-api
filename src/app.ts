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

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(loggerMiddleware);
app.use("/api/users", userRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/articles", articleRoutes);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(helmet());
app.use(limiter);

app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    handleError(err, res);
  }
);

export default app;
