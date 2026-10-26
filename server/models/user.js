
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },

    password: {
      type: String,
      required: true,
      minlength: 8,
      maxlength: 128,
      select: false,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    
    faceVerificationEnabled: {
      type: Boolean,
      default: false,
    },

  },
  { timestamps: true }
);

const { createModel } = require("../utils/memoryStore");

module.exports = createModel("User", userSchema);
