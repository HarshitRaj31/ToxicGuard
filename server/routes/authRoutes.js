
const crypto = require("crypto");
const PasswordReset = require("../models/PasswordReset");
const sendEmail = require("../utils/sendEmail");

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");

const User = require("../models/user");
const Activity = require("../models/Activity");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();
const FaceEnrollment = require("../models/FaceEnrollment");
const {
  decryptDescriptor,
} = require("../utils/faceEncryption");
// Limit repeated registration and login requests
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many authentication attempts. Please try again later.",
  },
});

const faceLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many face login attempts. Please try again later.",
  },
});

// REGISTER — create a regular user account
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return res.status(400).json({
        message: "Name, email, and password must be valid text values.",
      });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    if (normalizedName.length > 80) {
      return res.status(400).json({
        message: "Name cannot exceed 80 characters.",
      });
    }

    if (
      normalizedEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        message: "Please enter a valid email address.",
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: "user",
    });

    try {
      await Activity.create({
        user: user._id,
        userName: user.name,
        userEmail: user.email,
        action: "REGISTER",
        details: "New account registered",
        ipAddress: req.ip,
      });
    } catch (activityError) {
      console.error(
        "Registration activity logging failed:",
        activityError.message
      );
    }

    return res.status(201).json({
      message: "Registration successful",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "An account with this email already exists.",
      });
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      message: "Unable to register. Please try again.",
    });
  }
});

// LOGIN — authenticate an existing user
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      !email.trim() ||
      !password ||
      email.length > 254 ||
      password.length > 128
    ) {
      return res.status(400).json({
        message: "Please provide a valid email and password.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Require a passkey for accounts that have enabled two-factor login.
    if (user.faceVerificationEnabled) {
      const hasPasskey = await require("../models/Passkey").exists({
        user: user._id,
      });

      if (!hasPasskey) {
        return res.status(403).json({
          message:
            "Two-factor login is enabled, but no passkey is registered. Contact support to recover access.",
        });
      }

      const secret = process.env.JWT_SECRET;

      if (!secret) {
        return res.status(500).json({
          message: "Authentication is not configured.",
        });
      }

      const preAuthToken = jwt.sign(
        {
          userId: user._id.toString(),
          purpose: "passkey-login",
              jti: crypto.randomUUID(),
        },
        secret,
        {
          expiresIn: "5m",
          algorithm: "HS256",
        }
      );

      return res.status(200).json({
        requiresPasskey: true,
        preAuthToken,
        message: "Password verified. Passkey verification required.",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      console.error("JWT_SECRET is missing from the environment.");

      return res.status(500).json({
        message: "Authentication is not configured.",
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      secret,
      {
        expiresIn: "1d",
        algorithm: "HS256",
      }
    );

    try {
      await Activity.create({
        user: user._id,
        userName: user.name,
        userEmail: user.email,
        action: "LOGIN",
        details: "User logged in successfully",
        ipAddress: req.ip,
      });
    } catch (activityError) {
      console.error(
        "Login activity logging failed:",
        activityError.message
      );
    }

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in. Please try again.",
    });
  }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many password reset attempts. Please try again later.",
  },
});

// Request a password-reset OTP
router.post("/forgot-password", otpLimiter, async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    if (!email || email.length > 254) {
      return res.status(400).json({ message: "Please enter a valid email." });
    }

    const user = await User.findOne({ email });

    // Use the same response whether the account exists or not.
    const responseMessage =
      "If an account exists for this email, an OTP will be sent.";

    if (!user) {
      return res.status(200).json({ message: responseMessage });
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await PasswordReset.deleteMany({ email });

    await PasswordReset.create({
      email,
      otpHash,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      attempts: 0,
    });

    try {
      await sendEmail({
        to: email,
        subject: "Your ToxicGuard password-reset OTP",
        text: `Your ToxicGuard OTP is ${otp}. It expires in 5 minutes. If you did not request this, ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
            <h2 style="color:#2563eb">ToxicGuard</h2>
            <p>Use this one-time password to reset your password:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f1f5f9;text-align:center">${otp}</div>
            <p>This code expires in 5 minutes. Never share it with anyone.</p>
          </div>
        `,
      });
    } catch (emailError) {
      await PasswordReset.deleteMany({ email });
      throw emailError;
    }

    return res.status(200).json({ message: responseMessage });
  } catch (error) {
    console.error("Forgot-password error:", error.message);
    return res.status(500).json({
      message: "Unable to send the OTP right now. Please try again later.",
    });
  }
});

// Verify an OTP
router.post("/verify-otp", otpLimiter, async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const otp =
      typeof req.body?.otp === "string" ? req.body.otp.trim() : "";

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Enter your email and six-digit OTP." });
    }

    const reset = await PasswordReset.findOne({ email });

    if (!reset || reset.expiresAt <= new Date() || reset.attempts >= 5) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Please request a new one.",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpHash !== reset.otpHash) {
      reset.attempts += 1;
      await reset.save();

      return res.status(400).json({
        message: "OTP is invalid or expired. Please request a new one.",
      });
    }

    return res.status(200).json({
      message: "OTP verified. You can now reset your password.",
    });
  } catch (error) {
    console.error("OTP verification error:", error.message);
    return res.status(500).json({ message: "Unable to verify OTP." });
  }
});

// Reset password after OTP verification
router.post("/reset-password", otpLimiter, async (req, res) => {
  try {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const otp =
      typeof req.body?.otp === "string" ? req.body.otp.trim() : "";
    const password =
      typeof req.body?.password === "string" ? req.body.password : "";

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Email and valid OTP are required." });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        message: "Password must be between 8 and 128 characters.",
      });
    }

    const reset = await PasswordReset.findOne({ email });

    if (!reset || reset.expiresAt <= new Date() || reset.attempts >= 5) {
      return res.status(400).json({
        message: "OTP is invalid or expired. Please request a new one.",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (otpHash !== reset.otpHash) {
      reset.attempts += 1;
      await reset.save();

      return res.status(400).json({
        message: "OTP is invalid or expired. Please request a new one.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await User.updateOne(
      { email },
      { $set: { password: hashedPassword } }
    );

    await PasswordReset.deleteMany({ email });

    return res.status(200).json({
      message: "Password reset successful. Please log in with your new password.",
    });
  } catch (error) {
    console.error("Password-reset error:", error.message);
    return res.status(500).json({
      message: "Unable to reset password. Please try again.",
    });
  }
});

// GET current user's profile
router.get("/profile", protect, (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = router;
