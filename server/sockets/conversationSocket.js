import Conversation from "../models/Conversation.js";

export const setupConversationSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Utilisateur connecté pour conversations:", socket.id);

    socket.on("join_user", (userId) => {
      socket.join(userId);
      console.log(`Utilisateur ${userId} rejoint sa room`);
    });

    socket.on("disconnect", () => {
      console.log("Utilisateur déconnecté", socket.id);
    });
  });
};