import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "toxicguard-default-jwt-secret-key-2026";
process.env.FACE_ENCRYPTION_KEY =
  process.env.FACE_ENCRYPTION_KEY ||
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const app = require("./server/app.js");
const User = require("./server/models/user.js");

const PORT = 3000;

async function ensureDefaultAdmin() {
  try {
    const email = (
      process.env.ADMIN_EMAIL || "admin@toxicguard.com"
    )
      .trim()
      .toLowerCase();
    const password = process.env.ADMIN_PASSWORD || "Admin@123456";

    const existing = await User.findOne({ email });
    if (!existing) {
      const hashedPassword = await bcrypt.hash(password, 12);
      await User.create({
        name: "System Admin",
        email,
        password: hashedPassword,
        role: "admin",
      });
      console.log(`Default admin ensured (${email})`);
    }
  } catch (err) {
    console.warn("Could not ensure default admin:", err.message);
  }
}

async function startServer() {
  mongoose.set("bufferCommands", false);

  if (process.env.MONGO_URI) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 4000,
      });
      console.log("MongoDB connected successfully.");
      await ensureDefaultAdmin();
    } catch (err) {
      console.warn(
        "MongoDB not connected — using built-in in-memory data store:",
        err.message
      );
    }
  } else {
    console.log(
      "MONGO_URI not set — running with pre-seeded in-memory database (admin@toxicguard.com / Admin@123456)"
    );
  }

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "vite.config.js"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    const modelsPath = path.resolve(__dirname, "Client/Toxic/public/models");
    app.use("/models", express.static(modelsPath));
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
