import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
      }
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    name: {
      type: String,
      default: "",
      trim: true,
      sparse: true,
      minlength: 3,
      maxlength: 40,
    },
    groupPicture: {
      type: String,
      default: "",
    },
    color: {
      type: String,
      default: "#FF0000",
      match: /^#([0-9A-F]{6})$/i
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model("Conversation", conversationSchema);
