import express from "express";

import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();


const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Création du dossier temporaire pour l'instant
    const tempDir = path.join("media", "temp");
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `temp${ext}`);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Seulement les images sont autorisées (jpeg, jpg, png)'));
    }
  }
});

router.delete("/:messageId", protect, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: "Message introuvable" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    const conversationId = message.conversationId;
    await Message.findByIdAndDelete(req.params.messageId);

    // Si c'était le lastMessage, trouver le nouveau dernier message
    const conversation = await Conversation.findById(conversationId);
    if (conversation && conversation.lastMessage?.toString() === message._id.toString()) {
      const newLastMessage = await Message.findOne({ conversationId })
        .sort({ createdAt: -1 })
        .limit(1);

      conversation.lastMessage = newLastMessage?._id || null;
      await conversation.save();

      // Mettre à jour via socket
      await conversation.populate("participants", "firstName lastName profilePicture");
      await conversation.populate({
        path: "lastMessage",
        select: "sender text createdAt editedAt",
        populate: {
          path: "sender",
          select: "firstName lastName profilePicture"
        }
      });

      const io = req.app.get("io");
      conversation.participants.forEach(participant => {
        io.to(participant._id.toString()).emit("last_message_updated", {
          conversationId,
          conversation
        });
      });
    }
    return res.json({"success": true, message: "Message supprimé avec succès" }); 

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.patch("/:messageId", protect, async (req, res) => {
  try {
    const { text } = req.body;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    }

    // Vérifier que l'utilisateur est bien le propriétaire du message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Non autorisé" });
    }

    // Mise à jour
    message.text = text;
    message.editedAt = new Date();
    await message.save();
    
    await message.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "seenBy.user", select: "firstName lastName profilePicture" }
    ]);
    
    // Émettre via socket
    const io = req.app.get("io");
    io.to(message.conversationId.toString()).emit("message_updated", message);

    // Si c'est le dernier message, mettre à jour la conversation
    const conversation = await Conversation.findById(message.conversationId)
      .populate("participants", "firstName lastName profilePicture")
      .populate({
        path: "lastMessage",
        select: "sender text createdAt editedAt",
        populate: {
          path: "sender",
          select: "firstName lastName profilePicture"
        }
      });
    if (conversation && conversation.lastMessage?.toString() === message._id.toString()) {
  
      conversation.participants.forEach(participant => {
        io.to(participant._id.toString()).emit("last_message_updated", {
          conversationId: conversation._id,
          conversation
        });
      });
    }

    return res.json({
      success: true,
      message: message
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.patch("/:messageId/delete", protect, async (req, res) => {
  try {
    const { deleteType } = req.body;

    const message = await Message.findById(req.params.messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message introuvable" });
    };

   

    const conversation = await Conversation.findById(message.conversationId).populate("participants", "_id");
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    };


    // Mise à jour
    if (deleteType === "forMe") message.deletedFor = [...new Set([...(message.deletedFor || []), req.user._id])];
    else {
      // Vérifier que l'utilisateur est bien le propriétaire du message
      if (message.sender.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: "Non autorisé" });
      };
      message.deletedForEveryone =true
    };
    await message.save();
    
    await message.populate([
      { path: "sender", select: "firstName lastName profilePicture" },
      { path: "seenBy.user", select: "firstName lastName profilePicture" }
    ]);
    
    // Émettre via socket
    const io = req.app.get("io");
    conversation.participants.forEach(participant => {
      io.to(participant._id.toString()).emit("message_deleted", {
        messageId: message._id,
        deleteType,
        userId: req.user._id
      });
    });


    // Mettre à jour la conversation si c'est le dernier message
    if (conversation.lastMessage?.toString() === message._id.toString()) {
      conversation.participants.forEach(participant => {
        io.to(participant._id.toString()).emit("last_message_updated", {
          conversationId: conversation._id,
          conversation
        });
      });
    }

    return res.json({
      success: true,
      message: message
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});



router.get("/:conversationId", protect, async (req, res) => {
  try {
    const {conversationId} = req.params;
    const { limit = 100, before } = req.query;
    const query = { conversationId };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate("sender", "firstName lastName profilePicture")
      .populate("seenBy.user", "firstName lastName profilePicture");

    res.status(200).json(messages);
  } catch (err) {
    console.error("Error fetching messages:", err);
    res.status(500).json({ message: err.message });
  }
});


router.post("/", protect, upload.single("image"), async (req, res) => {
    try {
        const {conversationId, text} = req.body;
        const sender = req.user._id
        const message = new Message({conversationId, sender, text});
        await message.save({ validateBeforeSave: false });

        // Si une image est envoyée, déplacer dans le dossier définitif
        if (req.file) {
          const ext = path.extname(req.file.originalname);
          const dir = path.join("media", "conversations","images");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
          const newPath = path.join(dir, `${message._id}${ext}`);
          fs.renameSync(req.file.path, newPath);
    
          message.image = newPath; // enregistre chemin relatif ou URL
          await message.save();
        }

        
        await message.populate("sender", "firstName lastName profilePicture");

        
        await Conversation.findByIdAndUpdate(
              conversationId,
              { lastMessage: message._id },
              { deletedFor: []}
        );

        // Émettre le nouveau message via socket
        const io = req.app.get('io');
        io.to(conversationId).emit("new_message", message);

        // Émettre la mise à jour du lastMessage pour la liste des conversations
        const conversation = await Conversation.findById(conversationId)
          .populate("participants", "firstName lastName profilePicture")
          .populate({
            path: "lastMessage",
            select: "sender text createdAt editedAt",
            populate: {
              path: "sender",
              select: "firstName lastName profilePicture"
            }
          });

        if (conversation) {
          conversation.participants.forEach(participant => {
            io.to(participant._id.toString()).emit("last_message_updated", {
              conversationId,
              conversation
            });
          });
        }

        res.status(201).json(message);
    } catch(err) {
        console.error("Error creating message:", err);
        res.status(500).json({ message: err.message });
    }
    

})


export default router;
