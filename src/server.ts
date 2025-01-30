import "dotenv/config";
import app from "./app";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { IMessagePopulated } from "./models/Message";
import messageRoutes from "./routes/messageRoutes";
import rateLimit from "express-rate-limit";

interface MessageDocument extends Document {
  _id: mongoose.Types.ObjectId;
  content: string;
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

interface ServerToClientEvents {
  "receive-message": (message: IMessagePopulated) => void;
  user_status: (data: { userId: string; online: boolean }) => void;
}

interface ClientToServerEvents {
  "send-message": (message: IMessagePopulated) => void;
}

interface InterServerEvents {
  ping: () => void;
  connection_error: (err: Error) => void;
}

interface SocketData {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limite chaque IP à 100 requêtes par fenêtre
});

app.use("/api/", limiter);

if (
  process.env.PORT &&
  process.env.MONGO_URI &&
  process.env.CLIENT_URL &&
  process.env.ADMIN_EMAIL &&
  process.env.JWT_SECRET
) {
  const PORT = process.env.PORT;
  const MONGO_URI = process.env.MONGO_URI;

  const httpServer = http.createServer(app);

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: ["http://localhost:4200", "http://localhost:5173"],
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ["Authorization"]
    },
    path: "/socket.io/",
    transports: ["websocket", "polling"]
  });

  io.engine.on("connection_error", (err) => {
    console.log("Connection error:", err);
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) return next(new Error("Authentication error"));
        socket.data.user = decoded;
        next();
      }
    );
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    const token = socket.handshake.auth.token;

    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          console.log("Token verification failed:", err);
          socket.disconnect();
          return;
        }

        socket.data.user = decoded;
        console.log("User authenticated:", decoded.email);
      }
    );

    socket.on("send-message", async (message) => {
      try {
        // Émettre uniquement au destinataire
        socket.broadcast.emit("receive-message", message);
      } catch (error) {
        console.error("Error handling socket message:", error);
      }
    });

    socket.on("error", (error: Error) => {
      console.log("Socket error:", error);
    });

    socket.on("disconnect", (reason) => {
      console.log("User disconnected:", socket.id, "Reason:", reason);
    });

    // Quand un utilisateur se connecte
    if (socket.data.user) {
      socket.broadcast.emit("user_status", {
        userId: socket.data.user.id,
        online: true
      });
    }

    socket.on("disconnect", () => {
      if (socket.data.user) {
        socket.broadcast.emit("user_status", {
          userId: socket.data.user.id,
          online: false
        });
      }
    });
  });

  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB");
      httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log("Socket.IO configured and listening");
      });
    })
    .catch((err) => {
      console.error("Database connection error:", err);
    });

  app.use("/api/messages", messageRoutes);
} else {
  console.error("Missing required environment variables");
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
    console.error('🔥 Erreur non gérée:', error);
});

process.on('uncaughtException', (error) => {
    console.error('🔥 Exception non capturée:', error);
    process.exit(1);
});
