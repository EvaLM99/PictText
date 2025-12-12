import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { protect } from "../middleware/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'media/profile-pictures';
    // Créer le dossier s'il n'existe pas
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Utiliser l'ID de l'utilisateur comme nom de fichier
    const ext = path.extname(file.originalname);
    cb(null, `${req.user._id}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
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

function formatName(name) {
  return name
    .toLowerCase()
    .split(/([\s-'])/)
    .map(part =>
      part.match(/[\s-']/)
        ? part
        : part.charAt(0).toUpperCase() + part.slice(1)
    )
    .join("");
}


function matchSeparator(name) {
  if (name.includes('-')) return '-';
  if (name.includes("'")) return "'";
  return ' ';
}




router.post("/friends/:id/invite", protect, async(req, res) => {
  try {
    console.log('ok');
    const friendId = req.params.id;
    const userId = req.user._id.toString();

    if (friendId === userId) {
      return res.status(400).json({ message: "Vous ne pouvez pas vous envoyer une invitation à vous-même" });
    }

    const user = await User.findById(userId).select("friendInvitations friends");
    const friend = await User.findById(friendId).select("friendInvitations friends");

    if (!user || !friend) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Ajouter l'invitation dans les tableaux
    user.friendInvitations.push({ user: friendId, type: "sent" });
    friend.friendInvitations.push({ user: userId, type: "received" });

    await user.save();
    await friend.save();

    res.status(200).json({ message: "Invitation envoyée avec succès !" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


router.post("/friends/:id/accept", protect, async(req, res) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id.toString();

    const user = await User.findById(userId).select("friendInvitations friends");
    const friend = await User.findById(friendId).select("friendInvitations friends");

    if (!user || !friend) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Vérifier qu'il y a bien une invitation reçue
    const invitationIndex = user.friendInvitations.findIndex(
      (inv) => inv.user.toString() === friendId && inv.type === "received"
    );

    if (invitationIndex === -1) {
      return res.status(404).json({ message: "Invitation introuvable" });
    }

    // Ajouter les amis dans les tableaux
    user.friends.push({ user: friendId });
    friend.friends.push({ user: userId });

    // Retirer l'invitation côté user
    user.friendInvitations.splice(invitationIndex, 1);

    // Retirer l'invitation côté friend
    const friendInvitationIndex = friend.friendInvitations.findIndex(
      (inv) => inv.user.toString() === userId && inv.type === "sent"
    );

    if (friendInvitationIndex !== -1) {
      friend.friendInvitations.splice(friendInvitationIndex, 1);
    }

  
    await user.save();
    await friend.save();

    res.status(200).json({ message: "Ami ajouté avec succès !" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


router.post("/friends/:id/decline", protect, async(req, res) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id.toString();

    const user = await User.findById(userId).select("friendInvitations");
    const friend = await User.findById(friendId).select("friendInvitations");

    if (!user || !friend) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Vérifier qu'il y a bien une invitation reçue
    const invitationIndex = user.friendInvitations.findIndex(
      (inv) => inv.user.toString() === friendId && inv.type === "received"
    );

    if (invitationIndex === -1) {
      return res.status(404).json({ message: "Invitation introuvable" });
    }

    // Retirer l'invitation côté user
    user.friendInvitations.splice(invitationIndex, 1);

    // Retirer l'invitation côté friend
    const friendInvitationIndex = friend.friendInvitations.findIndex(
      (inv) => inv.user.toString() === userId && inv.type === "sent"
    );
    if (friendInvitationIndex !== -1) {
      friend.friendInvitations.splice(friendInvitationIndex, 1);
    }

  
    await user.save();
    await friend.save();

    res.status(200).json({ message: "Invitation refusé avec succès !" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


router.post("/friends/:id/cancel", protect, async(req, res) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id.toString();

    const user = await User.findById(userId).select("friendInvitations");
    const friend = await User.findById(friendId).select("friendInvitations");

    if (!user || !friend) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Vérifier qu'il y a bien une invitation reçue
    const invitationIndex = user.friendInvitations.findIndex(
      (inv) => inv.user.toString() === friendId && inv.type === "sent"
    );

    if (invitationIndex === -1) {
      return res.status(404).json({ message: "Invitation introuvable" });
    }

    // Retirer l'invitation côté user
    user.friendInvitations.splice(invitationIndex, 1);

    // Retirer l'invitation côté friend
    const friendInvitationIndex = friend.friendInvitations.findIndex(
      (inv) => inv.user.toString() === userId && inv.type === "received"
    );
    if (friendInvitationIndex !== -1) {
      friend.friendInvitations.splice(friendInvitationIndex, 1);
    }

  
    await user.save();
    await friend.save();

    res.status(200).json({ message: "Invitation annulée avec succès !" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});


router.delete("/friends/:id", protect, async(req, res) => {
  try {
    const friendId = req.params.id;
    const userId = req.user._id;

    const user = await User.findById(userId).select("friends");
    const friend = await User.findById(friendId).select("friends");

    if (!user || !friend) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    // Vérifier qu'il y a bien une invitation reçue
    const friendIndex = user.friends.findIndex(
      (friend) => friend.user.toString() === friendId);

    if (friendIndex === -1) {
      return res.status(404).json({ message: "Ami introuvable" });
    }

    // Retirer l'invitation côté user
    user.friends.splice(friendIndex, 1);

    // Retirer l'invitation côté friend
     const userIndex = friend.friends.findIndex(
      (friend) => friend.user.toString() === userId);

    if (userIndex !== -1) {
      friend.friends.splice(userIndex, 1);
    }

  
    await user.save();
    await friend.save();

    res.status(200).json({ message: "Ami supprimé avec succès !" });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: err.message });
  }
});



router.patch("/me/active", protect, async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    user.isActive = !!isActive;
    if (isActive) user.lastActive = new Date();
    await user.save();

    res.json({ isActive: user.isActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


router.patch("/me/profile", protect, upload.single('profilePicture'), async (req, res) => {
  try {
    const userId = req.user._id;
    const { firstName, lastName, email, gender, birthday, phone } = req.body;


    // Vérifier si l'email existe déjà pour un autre utilisateur
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && !existingUser._id.equals(userId)) {
        return res.status(400).json({ email: "Cette adresse email est déjà utilisée" });
      }
    }

    const updateData = {};
    if (firstName) updateData.firstName = formatName(firstName);
    if (lastName) updateData.lastName = formatName(lastName);
    if (email) updateData.email = email;
    if (gender) updateData.gender = gender;
    if (birthday) updateData.birthday = birthday;
    if (phone) updateData.phone = phone;

    // Gestion de la photo de profil
    if (req.file) {
      // Récupérer l'ancienne photo pour la supprimer si l'extension change
      const oldUser = await User.findById(userId);
      if (oldUser && oldUser.profilePicture) {
        const oldExt = path.extname(oldUser.profilePicture);
        const newExt = path.extname(req.file.originalname);
        
        // Supprimer l'ancienne photo seulement si l'extension est différente
        if (oldExt !== newExt) {
          const oldPhotoPath = path.join(process.cwd(), oldUser.profilePicture.replace(/^\//, ''));
          if (fs.existsSync(oldPhotoPath)) {
            try {
              fs.unlinkSync(oldPhotoPath);
            } catch (err) {
              console.error('Erreur suppression ancienne photo:', err);
            }
          }
        }
      }
      // Stocker le chemin relatif avec l'extension du fichier uploadé
      updateData.profilePicture = `/media/profile-pictures/${userId}${path.extname(req.file.originalname)}`;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    res.status(200).json({ 
      message: "Profil mis à jour avec succès",
      data: user 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.patch("/me/password", protect, async (req, res) => {
  try{
    const user = await User.findById(req.user._id).select("+password");
    const { current_password, new_password } = req.body;
    const isMatch = await user.comparePassword(current_password);
    if (!isMatch) {
      return res.status(400).json({ message: "Mot de passe actuel incorrect" });
    }

    user.password = new_password;
    await user.save();
    
    res.status(200).json({ message: "Mot de passe modifié" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



router.get("/search", protect, async (req, res) => {
  try {
    const query = req.query.query.trim();

    // Sépare en mots : "alain dupont" → ["alain", "dupont"]
    const parts = query.split(/\s+/);

    let fullNameRegex = null;


    // Si 2 mots : firstname+lastname OU lastname+firstname
    if (parts.length >= 2) {
      const p1 = parts[0];
      const p2 = parts[1];

      fullNameRegex = {
        $or: [
          // firstname + lastname
          {
            $and: [
              { firstName: { $regex: p1, $options: "i" } },
              { lastName: { $regex: p2, $options: "i" } }
            ]
          },
          // lastname + firstname
          {
            $and: [
              { firstName: { $regex: p2, $options: "i" } },
              { lastName: { $regex: p1, $options: "i" } }
            ]
          }
        ]
      };
    }

    // Recherche de base
    const baseRegex = {
      $or: [
        { firstName: { $regex: query, $options: "i" } },
        { lastName: { $regex: query, $options: "i" } }
      ]
    };

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        fullNameRegex ? { $or: [baseRegex, fullNameRegex] } : baseRegex
      ]
    }).select("firstName lastName profilePicture friends friendInvitations");

    const result = users.map((user) => {
      let status = "not_friends";

      const me = req.user._id.toString();

      // 👍 Déjà amis ?
      if (user.friends.some(f => f.user.toString() === me))
        status = "friends";

      // 📩 Invitation envoyée ?
      else if (user.friendInvitations.some(inv => inv.user.toString() === me && inv.type === "received"))
        status = "invitation_sent";

      // 📨 Invitation reçue ?
      else if (user.friendInvitations.some(inv => inv.user.toString() === me && inv.type === "sent"))
        status = "invitation_received";

      return {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        friendStatus: status
      };
    });

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


// ✅ Vérifie si un email existe déjà
router.get("/check-email", async (req, res) => {
  try {
    const { email, userId } = req.query; 
    const user = await User.findOne({ email });

    if (!user) {
      return res.json({ exists: false });
    }
    
    if (userId && user._id.toString() === userId) {
      return res.json({ exists: false });
    }
    
    res.json({ exists: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Enregistrement utilisateur
router.post("/register", async (req, res) => {
  try {
    const { firstName, lastName, email, password, gender, birthday, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email déjà utilisé" });

    const user = new User({
      firstName: formatName(firstName),
      lastName: formatName(lastName),
      email,
      password,
      gender,
      birthday,
      phone,
    });

    // Générer un JWT
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });
    
    // Stocker le refresh token en DB pour invalidation
    user.refreshToken = refreshToken;
    await user.save();

    res.status(201).json({
      message: "Utilisateur créé",
      access: accessToken,
      refresh: refreshToken,
      user: { id: user._id, email: user.email, firstName: user.firstName }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Connexion utilisateur
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user) return res.status(400).json({ message: "Utilisateur non trouvé" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: "Mot de passe incorrect" });

    // Générer un JWT
    const accessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

    // Stocker le refresh token en DB pour invalidation
    await User.findByIdAndUpdate(
      user._id,
      { refreshToken, isActive: true },
      { new: true } // renvoie le document mis à jour si besoin
    );


    res.status(200).json({
      message: "Connexion réussie",
      access: accessToken,
      refresh: refreshToken,
      user: { id: user._id, email: user.email, firstName: user.firstName }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/logout", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("+refreshToken");
    if (!user) return res.status(404).json({ message: "Utilisateur non trouvé" });

    user.refreshToken = null; 
    user.isActive = false; // <- utilisateur déconnecté
    await user.save();

    res.status(200).json({ message: "Déconnexion réussie" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// Refresh token endpoint
router.post("/token/refresh", async (req, res) => {
  const { refresh } = req.body;
  if (!refresh) return res.status(401).json({ message: "Pas de token" });

  try {
    const decoded = jwt.verify(refresh, process.env.REFRESH_SECRET);
    const user = await User.findById(decoded.id).select("+refreshToken");
    if (!user || user.refreshToken !== refresh) return res.status(403).json({ message: "Token invalide" });

    const newAccessToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "15m" });
    res.json({ access: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token invalide" });
  }
});

router.get("/:id/friends", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate("friends.user", "firstName lastName profilePicture isActive")
      .populate("friendInvitations.user", "firstName lastName profilePicture")

    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const sentInvitations = user.friendInvitations.filter(inv => inv.type === "sent");
    const receivedInvitations = user.friendInvitations.filter(inv => inv.type === "received");

    res.status(200).json({
      friends: user.friends,
      sentInvitations,
      receivedInvitations,
    });

   
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.get("/:id", protect, async (req, res) => {
  try{
    const user = await User.findById(req.params.id)
      .select("firstName lastName profilePicture gender birthday email phone isActive")
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});



export default router;
