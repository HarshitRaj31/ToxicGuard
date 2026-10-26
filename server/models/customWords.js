const mongoose = require("mongoose");
const customWordSchema = new mongoose.Schema(
  {
    word: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);
const { createModel } = require("../utils/memoryStore");
module.exports = createModel("CustomWord", customWordSchema);