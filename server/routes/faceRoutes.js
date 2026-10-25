
const express = require("express");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
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

const adminFaceLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many face login attempts. Try again later.",
  },
});

function isValidDescriptor(descriptor) {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === 128 &&
    descriptor.every(
      (value) => typeof value === "number" && Number.isFinite(value)
    )
  );
}

function calculateDistance(first, second) {
  return Math.sqrt(
    first.reduce(
      (sum, value, index) => sum + (value - second[index]) ** 2,
      0
    )
  );
}

// Admin face-only login prototype.
// Compares the submitted descriptor with enrolled ADMIN templates.
// This is a demo, not production-grade biometric authentication.
router.post("/admin-login", adminFaceLoginLimiter, async (req, res) => {
  try {
    const { descriptor } = req.body || {};

    if (!isValidDescriptor(descriptor)) {
      return res.status(400).json({
        message: "A valid face descriptor is required.",
      });
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        message: "Authentication is not configured.",
      });
    }

    // Only consider face templates belonging to admin accounts.
    const enrollments = await FaceEnrollment.find({})
      .select("+encryptedDescriptor user")
      .lean();

    let matchedUser = null;

    for (const enrollment of enrollments) {
      try {
        const user = await User.findById(enrollment.user)
          .select("name email role")
          .lean();

        if (!user || user.role !== "admin") {
          continue;
        }

        const savedDescriptor = decryptDescriptor(
          enrollment.encryptedDescriptor,
          enrollment.user.toString()
        );

        if (!isValidDescriptor(savedDescriptor)) {
          continue;
        }

        const distance = calculateDistance(
          descriptor,
          savedDescriptor
        );

        // Demo threshold only. It requires proper calibration.
        if (distance < 0.5) {
          matchedUser = user;
          break;
        }
      } catch (error) {
        // Skip an unreadable template without exposing its details.
        console.error("Admin face template check failed:", error.message);
      }
    }

    if (!matchedUser) {
      return res.status(401).json({
        message: "Face not recognized as an enrolled admin.",
      });
    }

    const token = jwt.sign(
      { userId: matchedUser._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: "1d", algorithm: "HS256" }
    );

    return res.json({
      verified: true,
      message: "Admin face matched.",
      token,
      user: {
        id: matchedUser._id.toString(),
        name: matchedUser.name,
        email: matchedUser.email,
        role: matchedUser.role,
      },
    });
  } catch (error) {
    console.error("Admin face login error:", error.message);

    return res.status(500).json({
      message: "Unable to complete face login. Please try again.",
    });
  }
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

    return res.json({ enrolled: Boolean(enrollment) });
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
    await FaceEnrollment.deleteOne({ user: req.user._id });

    return res.json({ message: "Face enrollment deleted." });
  } catch (error) {
    console.error("Face enrollment deletion error:", error.message);

    return res.status(500).json({
      message: "Unable to delete face enrollment.",
    });
  }
});

// Verify the signed-in user's face.
router.post("/verify", protect, faceLimiter, async (req, res) => {
  try {
    const { descriptor } = req.body || {};

    if (!isValidDescriptor(descriptor)) {
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

    const matched =
      calculateDistance(descriptor, enrolledDescriptor) < 0.5;

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
