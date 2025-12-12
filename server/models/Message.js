import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    text: {
      type: String,
    },
    image: {
      type: String,
    },  
    editedAt: {
      type: Date,
      default: null
    },
    deletedFor: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    deletedForEveryone: {
      type: Boolean,
      default: false
    },
    seenBy: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        seenAt: { type: Date, default: Date.now }
      }
    ]
  },
  { timestamps: true }
);

messageSchema.pre("validate", function (next) {
  if (!this.text && !this.image) {
    this.invalidate("text", "Un message doit contenir soit du texte soit une image.");
    this.invalidate("image", "Un message doit contenir soit du texte soit une image.");
  }
  next();
});

export default mongoose.model("Message", messageSchema);
