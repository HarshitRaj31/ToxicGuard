import "dotenv/config";
import express from "express";
import fs from "fs";
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
const app = require("./server/app.js");
const User = require("./server/models/user.js");

const PORT = 3000;

async function connectDatabaseInBackground() {
  mongoose.set("bufferCommands", false);

  if (!process.env.MONGO_URI) {
    console.log("MONGO_URI not set — running with instant in-memory database.");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log("MongoDB connected successfully.");

    // Remove demo accounts if previously created
    User.deleteMany({
      email: { $in: ["admin@toxicguard.com", "user@toxicguard.com"] },
    }).catch(() => {});
  } catch (err) {
    console.warn(
      "MongoDB not connected — using built-in in-memory data store:",
      err.message
    );
  }
}

async function startServer() {
  const distPath = path.resolve(__dirname, "dist");
  const distIndex = path.join(distPath, "index.html");
  const modelsPath = path.resolve(__dirname, "Client/Toxic/public/models");

  // Always serve biometric models with long cache headers for instant loading
  app.use(
    "/models",
    express.static(modelsPath, {
      maxAge: "7d",
      immutable: true,
    })
  );

  if (fs.existsSync(distIndex)) {
    // Serve pre-compiled production bundle for sub-second page loads
    app.use(
      "/assets",
      express.static(path.join(distPath, "assets"), {
        maxAge: "1y",
        immutable: true,
      })
    );
    app.use(express.static(distPath, { maxAge: 0 }));

    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api")) return next();
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(distIndex);
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "vite.config.js"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    connectDatabaseInBackground();
  });
}

startServer();
