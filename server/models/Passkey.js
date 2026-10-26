
const mongoose = require("mongoose");

const passkeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    credentialId: {
      type: String,
      required: true,
      unique: true,
    },

    publicKey: {
      type: String,
      required: true,
    },

    counter: {
      type: Number,
      required: true,
      default: 0,
    },

    transports: {
      type: [String],
      default: [],
    },

    deviceType: {
      type: String,
      enum: ["singleDevice", "multiDevice"],
      default: "singleDevice",
    },

    backedUp: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

const { createModel } = require("../utils/memoryStore");

module.exports = createModel("Passkey", passkeySchema);
