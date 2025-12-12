import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * Route de recherche globale
 * Recherche dans :
 * - Les noms de conversations (DM ou groupes)
 * - Les participants des conversations
 * - Le contenu des messages
 */
router.get("/", protect, async (req, res) => {
  try {
    const { query } = req.query;
    const userId = req.user._id;

    if (!query || query.trim().length === 0) {
      return res.json({
        conversations: [],
        messages: []
      });
    }

    const searchTerm = query.trim();
    const searchRegex = new RegExp(searchTerm, "i");

    // ========== 1. RECHERCHE DANS LES CONVERSATIONS ==========
    
    // Récupérer toutes les conversations de l'utilisateur
    const userConversations = await Conversation.find({
      participants: userId,
    })
      .populate("participants", "firstName lastName profilePicture")
      .populate("lastMessage", "createdAt");

    const matchingConversations = userConversations.filter(conv => {
      // Recherche dans le nom du groupe
      if (conv.name && searchRegex.test(conv.name)) {
        return true;
      }

      // Recherche dans les noms des participants (sauf soi-même)
      const otherParticipants = conv.participants.filter(
        p => p._id.toString() !== userId.toString()
      );

      return otherParticipants.some(participant => {
        const fullName = `${participant.firstName} ${participant.lastName}`;
        return searchRegex.test(fullName) || 
               searchRegex.test(participant.firstName) || 
               searchRegex.test(participant.lastName);
      });
    });

    // Formater les conversations pour le frontend
    const formattedConversations = matchingConversations.map(conv => {
      const others = conv.participants.filter(
        p => p._id.toString() !== userId.toString()
      );

      return {
        _id: conv._id,
        type: "conversation",
        name: conv.name || others.map(p => `${p.firstName} ${p.lastName}`).join(", "),
        picture: conv.groupPicture || others[0]?.profilePicture,
        participants: conv.participants,
        lastMessageDate: conv.lastMessage?.createdAt
      };
    });

    // ========== 2. RECHERCHE DANS LES MESSAGES ==========
    
    // Récupérer les IDs des conversations de l'utilisateur
    const conversationIds = userConversations.map(c => c._id);

    // Rechercher dans les messages non supprimés
    const matchingMessages = await Message.find({
      conversationId: { $in: conversationIds },
      text: { $regex: searchRegex },
      deletedFor: { $nin: userId },
      deletedForEveryone: false
    })
      .populate("sender", "firstName lastName profilePicture")
      .populate("conversationId", "participants name groupPicture")
      .sort({ createdAt: -1 })
      .limit(50); // Limiter à 50 résultats

    // Formater les messages avec le contexte de la conversation
    const formattedMessages = await Promise.all(
      matchingMessages.map(async (msg) => {
        const conversation = msg.conversationId;
        
        // Vérifier que l'utilisateur fait bien partie de cette conversation
        if (!conversation.participants.some(p => p.toString() === userId.toString())) {
          return null;
        }

        // Récupérer les infos complètes des participants
        await conversation.populate("participants", "firstName lastName profilePicture");

        const others = conversation.participants.filter(
          p => p._id.toString() !== userId.toString()
        );

        const conversationName = conversation.name || 
          others.map(p => `${p.firstName} ${p.lastName}`).join(", ");

        const conversationPicture = conversation.groupPicture || 
          others[0]?.profilePicture;

        // Extraire un extrait du message avec le terme recherché en surbrillance
        const highlightedText = highlightSearchTerm(msg.text, searchTerm);

        return {
          _id: msg._id,
          type: "message",
          conversationId: conversation._id,
          conversationName,
          conversationPicture,
          sender: msg.sender,
          text: msg.text,
          highlightedText,
          createdAt: msg.createdAt,
          image: msg.image
        };
      })
    );

    // Filtrer les messages null (conversations dont l'utilisateur ne fait pas partie)
    const validMessages = formattedMessages.filter(m => m !== null);

    res.json({
      conversations: formattedConversations,
      messages: validMessages
    });

  } catch (err) {
    console.error("Erreur recherche globale:", err);
    res.status(500).json({ message: err.message });
  }
});

/**
 * Fonction helper pour surligner le terme recherché dans le texte
 */
function highlightSearchTerm(text, searchTerm) {
  if (!text || !searchTerm) return text;

  const regex = new RegExp(`(${searchTerm})`, "gi");
  
  // Extraire un contexte autour du terme (50 caractères avant et après)
  const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
  
  if (index === -1) return text;

  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + searchTerm.length + 50);
  
  let excerpt = text.substring(start, end);
  
  // Ajouter "..." si tronqué
  if (start > 0) excerpt = "..." + excerpt;
  if (end < text.length) excerpt = excerpt + "...";

  return excerpt;
}

export default router;