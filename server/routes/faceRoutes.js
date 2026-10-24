
const express = require("express");
const rateLimit = require("express-rate-limit");

const { protect } = require("../middleware/authMiddleware");
const FaceEnrollment = require("../models/FaceEnrollment");
const {
  encryptDescriptor,
  decryptDescriptor,
} = require("../utils/faceEncryption");

const router = express.Router();

const faceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many face requests. Please try again later.",
  },
});

// Enroll or replace the signed-in user's face template.
router.post("/enroll", protect, faceLimiter, async (req, res) => {
  try {
    const { descriptor, consent, modelVersion } = req.body || {};

    if (consent !== true) {
      return res.status(400).json({
        message: "Explicit consent is required for face enrollment.",
      });
    }

    if (
      typeof modelVersion !== "string" ||
      modelVersion.length < 1 ||
      modelVersion.length > 50
    ) {
      return res.status(400).json({
        message: "A valid face model version is required.",
      });
    }

    // The encryption utility validates the descriptor's shape and values.
    const encryptedDescriptor = encryptDescriptor(
      descriptor,
      req.user._id.toString()
    );

    await FaceEnrollment.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          encryptedDescriptor,
          consentedAt: new Date(),
          enrolledAt: new Date(),
          modelVersion,
        },
      },
      {
        upsert: true,
        new: true,
        runValidators: true,
        setDefaultsOnInsert: true,
      }
    );

    return res.status(201).json({
      message: "Face template enrolled successfully.",
    });
  } catch (error) {
    console.error("Face enrollment error:", error.message);

    return res.status(400).json({
      message: "Unable to enroll face. Check the descriptor and configuration.",
    });
  }
});

// Check whether the signed-in user has a face enrollment.
router.get("/status", protect, faceLimiter, async (req, res) => {
  try {
    const enrollment = await FaceEnrollment.exists({
      user: req.user._id,
    });

    return res.json({
      enrolled: Boolean(enrollment),
    });
  } catch (error) {
    console.error("Face enrollment status error:", error.message);

    return res.status(500).json({
      message: "Unable to check face enrollment status.",
    });
  }
});

// Delete the signed-in user's biometric enrollment.
router.delete("/enroll", protect, faceLimiter, async (req, res) => {
  try {
    await FaceEnrollment.deleteOne({
      user: req.user._id,
    });

    return res.json({
      message: "Face enrollment deleted.",
    });
  } catch (error) {
    console.error("Face enrollment deletion error:", error.message);

    return res.status(500).json({
      message: "Unable to delete face enrollment.",
    });
  }
});

router.post("/verify", protect, faceLimiter, async (req, res) => {
  try {
    const { descriptor } = req.body || {};

    if (
      !Array.isArray(descriptor) ||
      descriptor.length !== 128 ||
      !descriptor.every(
        (value) => typeof value === "number" && Number.isFinite(value)
      )
    ) {
      return res.status(400).json({
        message: "A valid face descriptor is required.",
      });
    }

    const enrollment = await FaceEnrollment.findOne({
      user: req.user._id,
    }).select("+encryptedDescriptor");

    if (!enrollment) {
      return res.status(404).json({
        message: "No face enrollment found for this account.",
      });
    }

    const enrolledDescriptor = decryptDescriptor(
      enrollment.encryptedDescriptor,
      req.user._id.toString()
    );

    const distance = Math.sqrt(
      descriptor.reduce(
        (sum, value, index) =>
          sum + (value - enrolledDescriptor[index]) ** 2,
        0
      )
    );

    // Demo threshold only; calibrate before any security-sensitive use.
    const matched = distance < 0.5;

    return res.json({
      verified: matched,
      message: matched
        ? "Face matched the enrolled template."
        : "Face did not match the enrolled template.",
    });
  } catch (error) {
    console.error("Face verification error:", error.message);

    return res.status(500).json({
      message: "Unable to verify face. Please try again.",
    });
  }
});

module.exports = router;
