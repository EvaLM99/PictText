import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const likeSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema({
  imageUrl: String,
  title: {
    type: String,
    required: true,
  },
  content: String,
  author: {
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true,
    },
  likes: [likeSchema],
  comments: [commentSchema],
  },
  { timestamps: true }
);

export default mongoose.model("Post", postSchema);
