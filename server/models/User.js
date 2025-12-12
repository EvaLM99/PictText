import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const genders = ["male", "female"];
const invitationTypes = ["received", "sent"]

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "Le prénom est requis"],
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    lastName: {
      type: String,
      required: [true, "Le nom de famille est requis"],
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    profilePicture: {
      type: String,
      default: "",
    },
    birthday: {
      type: Date,
      required: true,
    },
    email: {
      type: String,
      required: [true, "L'adresse mail est requise"],
      unique: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Veuillez entrer une adresse e-mail valide"],
    },
    phone: {
      type: String,
      trim: true,
      sparse: true,
      match: [
        /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
        "Veuillez entrer un numéro de téléphone valide",
      ],
    },
    gender: {
      type: String,
      enum: genders,
      required: [true, "Le genre est requis"],
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      trim: true,
      minlength: 8,
      select: false,
      match: [
        /^(?=.*[A-Z])(?=.*\d)(?=.*[.!@#$%^&*()_+])[A-Za-z\d.!@#$%^&*()_+]{8,}$/,
        "Veuillez entrer au moins 8 caractères, une majuscule, un chiffre et un caractère spécial.",
      ],
    },
    refreshToken: {
      type: String,
      default: null,
      select: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    friends: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        since: {
          type: Date,
          default: Date.now
        }
      }
      ],
    friendInvitations: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true
        },
        type: {
          type: String,
          enum: invitationTypes,
          required: true
        },
        since: {
          type: Date,
          default: Date.now
        }
      }
    ]

  },
  { timestamps: true } // Génère automatiquement createdAt et updatedAt
);


userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  if (this.phone === "") {
    this.phone = null;
  }
  
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};


export default mongoose.model("User", userSchema);
