
const express = require("express");
const jwt = require("jsonwebtoken");
const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require("@simplewebauthn/server");
const PasswordlessChallenge = require("../models/PasswordlessChallenge");
const User = require("../models/user");
const crypto = require("crypto");

const { protect } = require("../middleware/authMiddleware");

const Passkey = require("../models/Passkey");
const WebAuthnChallenge = require("../models/WebAuthnChallenge");
const {
  rpName,
  rpID,
  expectedOrigin,
} = require("../config/webauthn");

const router = express.Router();

const challengeExpiryMs = 5 * 60 * 1000;

// Start passkey registration for a signed-in user.
router.post("/register/options", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const existingPasskeys = await Passkey.find({ user: user._id });

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user._id.toString()),
      userName: user.email,
      userDisplayName: user.name,
      attestationType: "none",
      excludeCredentials: existingPasskeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
     authenticatorSelection: {
  residentKey: "required",
  requireResidentKey: true,
  userVerification: "required",
},
    });

    await WebAuthnChallenge.deleteMany({
      user: user._id,
      purpose: "registration",
    });

    await WebAuthnChallenge.create({
      user: user._id,
      challenge: options.challenge,
      purpose: "registration",
      expiresAt: new Date(Date.now() + challengeExpiryMs),
    });

    return res.json(options);
  } catch (error) {
    console.error("Passkey registration options error:", error.message);
    return res.status(500).json({
      message: "Unable to start passkey registration.",
    });
  }
});

// Verify the authenticator response and store its public credential.
router.post("/register/verify", protect, async (req, res) => {
  try {
    const challengeRecord = await WebAuthnChallenge.findOne({
      user: req.user._id,
      purpose: "registration",
      expiresAt: { $gt: new Date() },
    }).sort({ createdAt: -1 });

    if (!challengeRecord) {
      return res.status(400).json({
        message: "Registration challenge expired. Please try again.",
      });
    }

    // Consume the challenge before verification to prevent replay.
    await WebAuthnChallenge.deleteOne({ _id: challengeRecord._id });

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({
        message: "Passkey registration could not be verified.",
      });
    }

const {
  credential,
  credentialDeviceType,
  credentialBackedUp,
} = verification.registrationInfo;

await Passkey.create({
  user: req.user._id,
  credentialId: credential.id,
  publicKey: Buffer.from(credential.publicKey).toString("base64url"),
  counter: credential.counter,
  transports: credential.transports || [],
  deviceType: credentialDeviceType,
  backedUp: credentialBackedUp,
});

    return res.status(201).json({
      message: "Passkey registered successfully.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This passkey is already registered.",
      });
    }

    console.error("Passkey registration verification error:", error.message);
    return res.status(400).json({
      message: "Unable to verify passkey registration.",
    });
  }
});

// Start passkey authentication for a known account.

router.post("/login/options", async (req, res) => {
  try {
    const { preAuthToken } = req.body;

    if (!preAuthToken) {
      return res.status(401).json({
        message: "Password verification is required first.",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "Authentication is not configured.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(preAuthToken, secret, {
        algorithms: ["HS256"],
      });
    } catch {
      return res.status(401).json({
        message: "Your login attempt has expired. Please sign in again.",
      });
    }

    if (
      decoded.purpose !== "passkey-login" ||
      !decoded.userId ||
      !decoded.jti
    ) {
      return res.status(401).json({
        message: "Invalid login attempt.",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.faceVerificationEnabled) {
      return res.status(401).json({
        message: "Passkey login is not enabled for this account.",
      });
    }

    const passkeys = await Passkey.find({ user: user._id });

    if (passkeys.length === 0) {
      return res.status(400).json({
        message: "No passkey is registered for this account.",
      });
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: passkeys.map((passkey) => ({
        id: passkey.credentialId,
        transports: passkey.transports,
      })),
      userVerification: "required",
    });

    await WebAuthnChallenge.deleteMany({
      user: user._id,
      purpose: "authentication",
    });

    await WebAuthnChallenge.create({
      user: user._id,
      challenge: options.challenge,
      purpose: "authentication",
      preAuthJti: decoded.jti,
      expiresAt: new Date(Date.now() + challengeExpiryMs),
    });

    return res.json(options);
  } catch (error) {
    console.error("Passkey login options error:", error);
    return res.status(500).json({
      message: "Unable to start passkey verification.",
    });
  }
});



router.post("/login/verify", async (req, res) => {
  try {
    const { preAuthToken, response } = req.body || {};

    if (!preAuthToken || !response || !response.id) {
      return res.status(400).json({
        message: "Login token and passkey response are required.",
      });
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return res.status(500).json({
        message: "Authentication is not configured.",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(preAuthToken, secret, {
        algorithms: ["HS256"],
      });
    } catch {
      return res.status(401).json({
        message: "Login attempt expired. Please sign in again.",
      });
    }

    if (
      decoded.purpose !== "passkey-login" ||
      !decoded.userId ||
      !decoded.jti
    ) {
      return res.status(401).json({
        message: "Invalid login attempt.",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user || !user.faceVerificationEnabled) {
      return res.status(401).json({
        message: "Passkey authentication failed.",
      });
    }

    // Find and consume the challenge for this exact login attempt.
    const challengeRecord = await WebAuthnChallenge.findOneAndDelete({
      user: user._id,
      purpose: "authentication",
      preAuthJti: decoded.jti,
      expiresAt: { $gt: new Date() },
    });

    if (!challengeRecord) {
      return res.status(401).json({
        message: "Challenge expired or already used. Please try again.",
      });
    }

    const passkey = await Passkey.findOne({
      user: user._id,
      credentialId: response.id,
    });

    if (!passkey) {
      return res.status(401).json({
        message: "Passkey authentication failed.",
      });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return res.status(401).json({
        message: "Passkey authentication failed.",
      });
    }

    passkey.counter = verification.authenticationInfo.newCounter;
    await passkey.save();

    // Issue the real session token only after successful verification.
    const token = jwt.sign(
      { userId: user._id.toString() },
      secret,
      {
        expiresIn: "1d",
        algorithm: "HS256",
      }
    );

    return res.status(200).json({
      verified: true,
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Passkey login verification error:", error.message);

    return res.status(400).json({
      message: "Unable to verify passkey. Please try again.",
    });
  }
});

const passkeySettingsLimiter = require("express-rate-limit")({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/enable-two-factor", protect, passkeySettingsLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    const hasPasskey = await Passkey.exists({
      user: user._id,
    });

    if (!hasPasskey) {
      return res.status(400).json({
        message: "Register a passkey before enabling two-factor login.",
      });
    }

    user.faceVerificationEnabled = true;
    await user.save();

    return res.json({
      enabled: true,
      message: "Passkey-based two-factor login enabled.",
    });
  } catch (error) {
    console.error("Enable two-factor error:", error.message);

    return res.status(500).json({
      message: "Unable to enable two-factor login.",
    });
  }
});

router.post("/disable-two-factor", protect, passkeySettingsLimiter, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    user.faceVerificationEnabled = false;
    await user.save();

    return res.json({
      enabled: false,
      message: "Passkey-based two-factor login disabled.",
    });
  } catch (error) {
    console.error("Disable two-factor error:", error.message);

    return res.status(500).json({
      message: "Unable to disable two-factor login.",
    });
  }
});

router.get("/two-factor-status", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(401).json({
        message: "User not found.",
      });
    }

    return res.json({
      enabled: user.faceVerificationEnabled === true,
    });
  } catch (error) {
    console.error("Two-factor status error:", error.message);

    return res.status(500).json({
      message: "Unable to load security settings.",
    });
  }
});


/*
 * Start passwordless login.
 * No email or password is required.
 */
router.post("/passwordless/options", async (req, res) => {
  try {
    const attemptId = crypto.randomUUID();

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [],
      userVerification: "required",
    });

    await PasswordlessChallenge.create({
      attemptId,
      challenge: options.challenge,
      expiresAt: new Date(Date.now() + challengeExpiryMs),
    });

    return res.json({
      attemptId,
      options,
    });
  } catch (error) {
    console.error("Passwordless options error:", error.message);
    return res.status(500).json({
      message: "Unable to start passwordless login.",
    });
  }
});

/*
 * Verify a discoverable passkey and log in its owner.
 */
router.post("/passwordless/verify", async (req, res) => {
  try {
    const { attemptId, response } = req.body || {};

    if (!attemptId || !response?.id || !response?.response) {
      return res.status(400).json({
        message: "Passkey response and login attempt are required.",
      });
    }

    // Consume the challenge once, only while it is valid.
    const challengeRecord =
      await PasswordlessChallenge.findOneAndDelete({
        attemptId,
        expiresAt: { $gt: new Date() },
      });

    if (!challengeRecord) {
      return res.status(401).json({
        message: "Login attempt expired or already used. Try again.",
      });
    }

    // Identify the credential from the authenticator's response.
    const passkey = await Passkey.findOne({
      credentialId: response.id,
    });

    if (!passkey) {
      return res.status(401).json({
        message: "Passkey not recognized. Register it and try again.",
      });
    }

    const user = await User.findById(passkey.user);

    if (!user) {
      return res.status(401).json({
        message: "The account associated with this passkey was not found.",
      });
    }

    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeRecord.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: Buffer.from(passkey.publicKey, "base64url"),
        counter: passkey.counter,
        transports: passkey.transports,
      },
      requireUserVerification: true,
    });

    if (!verification.verified) {
      return res.status(401).json({
        message: "Passkey authentication failed.",
      });
    }

    // Update the authenticator's signature counter.
    passkey.counter = verification.authenticationInfo.newCounter;
    await passkey.save();

    const secret = process.env.JWT_SECRET;

    if (!secret) {
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

    return res.status(200).json({
      verified: true,
      message: "Passwordless login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Passwordless verification error:", error.message);
    return res.status(400).json({
      message: "Unable to verify passkey. Please try again.",
    });
  }
});

module.exports = router;
