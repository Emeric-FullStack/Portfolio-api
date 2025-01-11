import "dotenv/config"; // Charger les variables d'environnement
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

const PORT = process.env.PORT || 5001;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/portfolio";

// Créer un serveur HTTP pour supporter Socket.IO
const httpServer = http.createServer(app);

// Initialiser Socket.IO
const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const connectedUsers = new Map<string, string>(); // Map pour stocker les utilisateurs connectés (email -> socket.id)
const ADMIN_EMAIL = "tourel.emeric@gmail.com";

io.on("connection", (socket) => {
  const token = socket.handshake.auth.token;

  jwt.verify(
    token,
    process.env.JWT_SECRET as string,
    (err: any, decoded: any) => {
      if (err) {
        console.log("Token invalide, déconnexion.");
        socket.disconnect();
        return;
      }

      socket.data.user = decoded; // Utilisation typée
      connectedUsers.set(decoded.email, socket.id);
      console.log(`Nouvel utilisateur connecté: ${decoded.email}`);
    }
  );

  socket.on(
    "send-message",
    async (message: { content: string; receiverEmail?: string }) => {
      const { content } = message;
      const senderEmail = socket.data.user?.email;

      // Vérifiez si l'expéditeur est authentifié
      if (!senderEmail) {
        console.log("Utilisateur non authentifié.");
        return;
      }

      // Restreindre l'envoi uniquement à l'admin
      const receiverEmail = ADMIN_EMAIL;

      try {
        // Enregistrer le message dans la base de données
        const newMessage = new Message({
          content,
          sender: socket.data.user?.id, // ID de l'utilisateur
          createdAt: new Date()
        });

        await newMessage.save();

        // Vérifiez si l'admin est connecté
        const receiverSocketId = connectedUsers.get(receiverEmail);
        if (receiverSocketId) {
          // Envoyer le message en temps réel à l'admin
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
