
const mongoose = require("mongoose");

const webAuthnChallengeSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    challenge: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ["registration", "authentication"],
      required: true,
    },
    preAuthJti: {
      type: String,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      expires: 0,
    },
  },
  { timestamps: true }
);

const { createModel } = require("../utils/memoryStore");

module.exports = createModel("WebAuthnChallenge", webAuthnChallengeSchema);
