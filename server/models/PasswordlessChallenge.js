
const mongoose = require("mongoose");

const passwordlessChallengeSchema = new mongoose.Schema(
  {
    attemptId: {
      type: String,
      required: true,
      unique: true,
    },
    challenge: {
      type: String,
      required: true,
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

module.exports = createModel(
  "PasswordlessChallenge",
  passwordlessChallengeSchema
);
