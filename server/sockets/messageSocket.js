import Message from "../models/Message.js";

export const setupMessageSocket = (io) => {
  io.on("connection", (socket) => {
    console.log("Nouvel utilisateur connecté", socket.id);

    socket.on("join_conversation", async({conversationId, userId}) => {
      console.log(`User ${socket.id} joined conversation ${conversationId}`);
      socket.join(conversationId);
      const messages = await Message.find({ 
        conversationId: conversationId, 
        "seenBy.user": { $ne: userId } 
      });

      for (let msg of messages) {
        if (msg.sender.toString() !== userId) {
          msg.seenBy.push({ user: userId, seenAt: new Date() });
          await msg.save();

          const populatedMessage = await Message.findById(msg._id)
            .populate("sender", "firstName lastName profilePicture")
            .populate("seenBy.user", "firstName lastName profilePicture");

          io.to(conversationId).emit("message_seen", populatedMessage);
        }
      }
    });

    socket.on("seen_message", async ({ messageId, userId }) => {
      try {
        const message = await Message.findById(messageId);
        if (!message) return;
        
        if (message.sender.toString() === userId) return;
        if (message.seenBy.some(s => s.user.toString() === userId)) return;

        message.seenBy = message.seenBy.filter(s => s.user.toString() !== userId);

        message.seenBy.push({ user: userId, seenAt: new Date() });
        await message.save();

        const populatedMessage = await Message.findById(messageId)
          .populate("sender", "firstName lastName profilePicture")
          .populate("seenBy.user", "firstName lastName profilePicture");
        
        io.to(message.conversationId.toString()).emit("message_seen", populatedMessage);
      } catch (err) {
        console.error("Erreur seen_message:", err);
      }
    });

    socket.on("disconnect", () => {
      console.log("Utilisateur déconnecté", socket.id);
    });
  });
};