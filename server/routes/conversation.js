import express from "express";

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
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

router.get("/between/:user1/:user2", protect, async (req, res) => {
  try {

    const { user1, user2 } = req.params;
    const conversation = await Conversation.findOne({
      participants: { $all: [user1, user2] }
    });
    if(!conversation) return res.json({ exists: false });

    res.json({ exists: true, conversation });
    
  } catch(err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
})


router.patch("/:conversationId/color", protect, async (req, res) => {
  try {
    const { color } = req.body;
    if (!/^#[0-9A-F]{6}$/i.test(color)) return res.status(400).json({ message: "Couleur invalide" });

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.conversationId,
      { color },
      { new: true }
    ).populate("participants", "firstName lastName profilePicture");

    const io = req.app.get("io");
    conversation.participants.forEach(participant => {
      io.to(participant._id.toString()).emit("conversation_color_updated", {
        conversationId: conversation._id,
        color: conversation.color,
        conversation
      });
    });

    if (!conversation) return res.status(404).json({ message: "Conversation introuvable" });

    res.json({ success: true, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.patch("/:conversationId/groupPicture", protect, upload.single('groupPicture'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Aucune image envoyée" });
    }

    const conversationId = req.params.conversationId;
    const oldConversation = await Conversation.findById(conversationId);
    if (!oldConversation) {
      return res.status(404).json({ message: "Conversation introuvable" });
    }

    const ext = path.extname(req.file.originalname);

    // Dossier final
    const finalDir = path.join("media", "conversations", "group-pictures");
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });

    // Chemin final
    const finalPath = path.join(finalDir, `${conversationId}${ext}`);

    // Supprimer l’ancienne image si elle existe et si extension change
    if (oldConversation.groupPicture) {
      const oldAbsPath = path.join(process.cwd(), oldConversation.groupPicture.replace(/^\//, ""));
      if (fs.existsSync(oldAbsPath)) {
        fs.unlinkSync(oldAbsPath);
      
      }
    }

    // Déplacer l’image du dossier temp → dossier final
    fs.renameSync(req.file.path, finalPath);

    // Mise à jour en DB
    const newPicturePath = `/media/conversations/group-pictures/${conversationId}${ext}`;

    const conversation = await Conversation.findByIdAndUpdate(
      conversationId,
      { groupPicture: newPicturePath },
      { new: true }
    ).populate("participants", "firstName lastName profilePicture");

    // Diffusion socket
    const io = req.app.get("io");
    conversation.participants.forEach(p => {
      io.to(p._id.toString()).emit("conversation_groupPicture_updated", {
        conversationId: conversation._id,
        groupPicture: conversation.groupPicture,
        conversation
      });
    });

    res.json({ success: true, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:conversationId/name", protect, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim().length < 3)
      return res.status(400).json({ message: "Nom trop court" });

    const conversation = await Conversation.findByIdAndUpdate(
      req.params.conversationId,
      { name: name.trim() },
      { new: true }
    ).populate("participants", "firstName lastName profilePicture")
    .populate({
      path: "lastMessage",
      select: "sender text createdAt editedAt",
      populate: {
        path: "sender",
        select: "firstName lastName profilePicture"
      }
    });

    const io = req.app.get("io");
    conversation.participants.forEach(participant => {
      io.to(participant._id.toString()).emit("conversation_name_updated", {
        conversationId: conversation._id,
        name: conversation.name,
        conversation
      });
    });

    res.json({ success: true, conversation });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



router.get("/:id", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate("participants", "firstName lastName profilePicture isActive") 
      .populate({
        path: "lastMessage",
        select: "sender text createdAt editedAt",
        populate: {
          path: "sender",
          select: "firstName lastName profilePicture"
        }
      })

    res.status(200).json(conversation);
  } catch (err) {
    console.error("Error fetching conversation:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Récupérer toutes les conversations de l'utilisateur
    const conversations = await Conversation.find({
      participants: userId,
      deletedFor: { $nin: userId },

    })
      .populate("lastMessage", "createdAt")
      .populate("participants", "firstName lastName profilePicture isActive")
      .sort({ updatedAt: -1 });

    // Pour chaque conversation, trouver le dernier message non supprimé pour cet utilisateur
    const conversationsWithLastMessage = await Promise.all(
      conversations.map(async (conversation) => {
        // Trouver le dernier message non supprimé pour cet utilisateur
        const lastMessage = await Message.findOne({
          conversationId: conversation._id,
          deletedFor: { $nin: userId }, // Pas supprimé pour cet utilisateur
        })
          .sort({ createdAt: -1 })
          .select("sender text createdAt editedAt deletedFor deletedForEveryone")
          .populate("sender", "firstName lastName profilePicture");

        // Convertir en objet plain pour pouvoir le modifier
        const conversationObj = conversation.toObject();
        conversationObj.lastMessage = lastMessage;
        conversationObj.lastMessage?.text ? conversationObj.lastMessage.deleted = false : conversationObj.lastMessage = {text: "", deleted: true, createdAt: conversation.lastMessage.createdAt};
        
        return conversationObj;
      })
    );

    // Trier par date du dernier message (ou updatedAt si pas de message)
    conversationsWithLastMessage.sort((a, b) => {
      const dateA = a.lastMessage?.createdAt || a.updatedAt;
      const dateB = b.lastMessage?.createdAt || b.updatedAt;
      return new Date(dateB) - new Date(dateA);
    });

  
    res.status(200).json(conversationsWithLastMessage);
  } catch (err) {
    console.error("Error fetching conversations:", err);
    res.status(500).json({ message: err.message });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const { participants, lastMessageText } = req.body;

    // --- Cas DM déjà existante ---
    if (participants.length === 2) {
      const existingConversation = await Conversation.findOne({
        participants: { $all: participants, $size: 2 }
      }).populate("participants", "firstName lastName profilePicture");

      if (existingConversation) {

        // Create message
        const message = await Message.create({
          conversationId: existingConversation._id,
          sender: req.user._id,
          text: lastMessageText
        });

        // Update last message
        existingConversation.lastMessage = message._id;
        existingConversation.deletedFor = []
        await existingConversation.save();

        // Populate lastMessage
        await existingConversation.populate({
          path: "lastMessage",
          select: "sender text createdAt editedAt",
          populate: {
            path: "sender",
            select: "firstName lastName profilePicture"
          }
        });

        // Émettre via socket la mise à jour du lastMessage
        const io = req.app.get("io");
        existingConversation.participants.forEach(participant => {
          io.to(participant._id.toString()).emit("last_message_updated", {
            conversationId: existingConversation._id,
            conversation: existingConversation
          });
        });

        return res.status(200).json({ 
          conversation: existingConversation, 
          message 
        });
      }
    }

    // --- Nouvelle conversation ---
    const conversation = await Conversation.create({
      participants,
      name: participants.length > 2 
        ? `Groupe - ${participants.length} participants` 
        : null
    });

    // Create message
    const message = await Message.create({
      conversationId: conversation._id,
      sender: req.user._id,
      text: lastMessageText || "a créé le groupe."
    });

    // Update lastMessage
    conversation.lastMessage = message._id;
    await conversation.save();

    // Populate
    await conversation.populate("participants", "firstName lastName profilePicture");
    await conversation.populate({
      path: "lastMessage",
      select: "sender text createdAt editedAt",
      populate: {
        path: "sender",
        select: "firstName lastName profilePicture"
      }
    });

    // Emit
    const io = req.app.get("io");
    participants.forEach(pid => {
      io.to(pid).emit("new_conversation", conversation);
    });

    res.status(201).json({ conversation, message });

  } catch (err) {
    console.error("Error creating conversation:", err);
    res.status(500).json({ message: err.message });
  }
});



router.delete("/:conversationId", protect, async (req, res) => {
  try {
    const conversationId = req.params.conversationId;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation introuvable" });

    // Supprimer le message de la DB
    await Conversation.findByIdAndDelete(conversationId);

    await Message.deleteMany({ conversationId: conversationId });


    return res.json({"success": true, message: "Conversation supprimée avec succès" }); 

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.patch("/:conversationId/delete", protect, async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation introuvable" });
    };

   
    conversation.deletedFor = [...new Set([...(conversation.deletedFor || []), req.user._id])];
    await conversation.save();

    const messages = await Message.find({
      conversationId: conversation._id
    })

    await Promise.all(
      messages.map(async (m) => {
        m.deletedFor = [...new Set([...(m.deletedFor || []), req.user._id])];
        return m.save();
      })
    );

    return res.json({
      success: true,
      message: "Conversation supprimée avec succès"
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});




export default router;
