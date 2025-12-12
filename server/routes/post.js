import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";

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

router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const { title, content } = req.body;

    // Créer le post dans MongoDB d'abord pour obtenir l'ID
    const post = new Post({
      title,
      content,
      author: req.user._id, // protect middleware fournit req.user
    });

    await post.save();

    // Si une image est envoyée, déplacer dans le dossier définitif
    if (req.file) {
      const ext = path.extname(req.file.originalname);
      const dir = path.join("media", "posts",`${req.user._id}_${post._id}`);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      const newPath = path.join(dir, `image${ext}`);
      fs.renameSync(req.file.path, newPath);

      post.imageUrl = newPath; // enregistre chemin relatif ou URL
      await post.save();
    }

    res.status(201).json(post);
  } catch (err) {
    console.error("Error creating post:", err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/", protect, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "firstName lastName") 
      .sort({ createdAt: -1 });
    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/friends
router.get("/friends", protect, async (req, res) => {
  try {

    const limit = parseInt(req.query.limit) || 10;
    const skip = parseInt(req.query.skip) || 0;

    const userId = req.user._id;


    const user = await User.findById(userId).populate("friends", "_id");
    const friendsIds = user.friends.map(f => f._id);

    friendsIds.push(userId);

    const posts = await Post.find({ author: { $in: friendsIds } })
                            .populate('author', 'firstName lastName profilePicture')
                            .populate('likes.author', 'firstName lastName')
                            .populate('comments.author', 'firstName lastName')
                            .sort({ createdAt: -1 })
                            .skip(skip)
                            .limit(limit);

    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.patch("/:id/like", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post introuvable" });

    const userId = req.user._id.toString();

    // Vérifie si l'utilisateur a déjà liké
    const existingLikeIndex = post.likes.findIndex(
      (like) => like.author.toString() === userId
    );

    if (existingLikeIndex === -1) {
      // Ajouter le like
      post.likes.push({ author: req.user._id });
    } else {
      // Retirer le like (toggle)
      post.likes.splice(existingLikeIndex, 1);
    }

    await post.save();
    const updatedPost = await Post.findById(post._id).populate("author", "firstName lastName");
    res.status(200).json(updatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
    .populate("author", "firstName lastName")
    .populate("comments.author", "firstName lastName");
    if (!post) return res.status(404).json({ message: "Post introuvable" });
    res.status(200).json(post);
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).json({ message: err.message });
  }
});


router.patch("/:id/comment", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post introuvable" });

    post.comments.push({ author: req.user._id, text: req.body.text });
    
    await post.save();
    const updatedPost = await Post.findById(post._id)
    .populate("author", "firstName lastName")
    .populate("comments.author", "firstName lastName");
    res.status(200).json(updatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.delete("/:postId/comments/:commentId", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post introuvable" });

    // Retirer le commentaire du tableau
    const commentIndex = post.comments.findIndex(
      (c) => c._id.toString() === req.params.commentId
    );
    if (commentIndex === -1)
      return res.status(404).json({ message: "Comment introuvable" });

    post.comments.splice(commentIndex, 1);
    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
    .populate("author")
    .populate("comments.author");

res.json(updatedPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.patch("/:postId/comments/:commentId", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post introuvable" });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Commentaire introuvable" });

    if (comment.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Non autorisé" });
    }

    comment.text = req.body.text;

    await post.save();

    const updatedPost = await Post.findById(req.params.postId)
    .populate("author")
    .populate("comments.author");

    res.json(updatedPost);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});


router.delete("/:postId", protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post introuvable" });

    // 1️⃣ Supprimer le post de la DB
    await Post.findByIdAndDelete(req.params.postId);

    // 2️⃣ Supprimer le dossier associé si imageUrl existe
    if (post.imageUrl) {
      const dir = path.dirname(post.imageUrl); // récupère le dossier contenant l'image
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Dossier supprimé : ${dir}`);
      }
    }

    return res.json({ message: "Post supprimé avec succès" }); 

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.get("/user/:userId", protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId })
    .populate("author", "firstName lastName")
    .populate("comments.author", "firstName lastName")
    .sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ message: err.message });
  }
});


export default router;
