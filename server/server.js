import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import compression from 'compression';
import { createServer } from "http";
import { Server } from "socket.io";
import { setupMessageSocket } from "./sockets/messageSocket.js";
import { setupConversationSocket } from "./sockets/conversationSocket.js";
import { setupPresenceSocket } from "./sockets/presenceSocket.js";
import postRouter from "./routes/post.js";
import userRouter from "./routes/user.js";
import conversationRouter from "./routes/conversation.js";
import messageRouter from "./routes/message.js";
import searchRouter from "./routes/search.js";

dotenv.config();

const app = express();
app.use(compression());
const httpServer = createServer(app);

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:3000",
  "http://192.168.1.52:3000",
  "http://192.168.1.51:3000",
];

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.set('io', io);

// Configuration Socket.IO
setupMessageSocket(io);
setupConversationSocket(io);
setupPresenceSocket(io);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Bienvenue sur PictText API !");
});

app.use("/api/posts", postRouter);
app.use("/api/users", userRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/messages", messageRouter);
app.use("/api/search", searchRouter);
app.use("/media", express.static(path.join(process.cwd(), "media")));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Serveur sur le port ${PORT}`);
});
