import "dotenv/config";
import app from "./app";
import mongoose from "mongoose";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "./models/Message";

interface ServerToClientEvents {
  "receive-message": (data: { content: string; senderEmail: string }) => void;
}
interface ClientToServerEvents {
  "send-message": (message: {
    content: string;
    receiverEmail?: string;
  }) => void;
}
interface InterServerEvents {
  ping: () => void;
}
interface SocketData {
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

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
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"]
    }
  });

  const connectedUsers = new Map<string, string>();
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  io.on("connection", (socket) => {
    const token = socket.handshake.auth.token;

    jwt.verify(
      token,
      process.env.JWT_SECRET as string,
      (err: any, decoded: any) => {
        if (err) {
          socket.disconnect();
          return;
        }

        socket.data.user = decoded;
        connectedUsers.set(decoded.email, socket.id);
        console.log(`Nouvel utilisateur connecté: ${decoded.email}`);
      }
    );

    socket.on(
      "send-message",
      async (message: { content: string; receiverEmail?: string }) => {
        if (!message.content || message.content.length > 1000) {
          return;
        }
        const { content } = message;
        const senderEmail = socket.data.user?.email;

        if (!senderEmail) {
          console.log("Utilisateur non authentifié.");
          return;
        }

        const receiverEmail = ADMIN_EMAIL;

        try {
          const newMessage = new Message({
            content,
            sender: socket.data.user?.id,
            createdAt: new Date()
          });

          await newMessage.save();

          const receiverSocketId = connectedUsers.get(receiverEmail);
          if (receiverSocketId) {
            io.to(receiverSocketId).emit("receive-message", {
              content,
              senderEmail
            });
            console.log(`Message de ${senderEmail} envoyé à ${receiverEmail}.`);
          } else {
            console.log(`Administrateur ${receiverEmail} non connecté.`);
          }
        } catch (err) {
          console.error("Erreur lors de l'enregistrement du message :", err);
        }
      }
    );

    socket.on("disconnect", () => {
      const userEmail = socket.data.user?.email;
      if (userEmail) {
        connectedUsers.delete(userEmail);
        console.log(`Utilisateur déconnecté: ${userEmail}`);
      }
    });
  });

  mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("Connected to MongoDB");
      httpServer.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    })
    .catch((err) => {
      console.error("Database connection error:", err);
    });
} else {
  console.error("Missing required environment variables");
}
