
const mongoose = require("mongoose");

const faceEnrollmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    // Store only an encrypted face descriptor, never a face image.
    encryptedDescriptor: {
      type: String,
      required: true,
      select: false,
    },

    consentedAt: {
      type: Date,
      required: true,
    },

    enrolledAt: {
      type: Date,
      default: Date.now,
      required: true,
    },

    modelVersion: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const { createModel } = require("../utils/memoryStore");

module.exports = createModel("FaceEnrollment", faceEnrollmentSchema);
