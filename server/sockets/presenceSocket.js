// src/sockets/presenceSocket.js
const activeUsers = {}; // userId -> Set de socketIds

export const setupPresenceSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("🔌 Nouvel utilisateur connecté pour présence :", socket.id);

    socket.on("join_user", (userId) => {
      socket.userId = userId;

      if (!activeUsers[userId]) activeUsers[userId] = new Set();
      activeUsers[userId].add(socket.id);

      // Notifier tous les amis (ou clients abonnés) que cet utilisateur est online
      io.emit("friend-online", { userId });
    });

    socket.on("disconnect", () => {
      const userId = socket.userId;
      if (userId && activeUsers[userId]) {
        activeUsers[userId].delete(socket.id);
        if (activeUsers[userId].size === 0) {
          // Plus de socket connecté → offline
          io.emit("friend-offline", { userId });
        }
      }
      console.log("🔌 Utilisateur déconnecté :", socket.id);
    });
  });
};
