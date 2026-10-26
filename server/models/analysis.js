const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema(
  {
    user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  required: false,
},
    comment: {
      type: String,
      required: true,
      trim: true,
    },

    result: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      required: true,
    },

    confidence: {
      type: Number,
      required: true,
    },

    detectedLabels: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const { createModel } = require("../utils/memoryStore");

module.exports = createModel("Analysis", analysisSchema);