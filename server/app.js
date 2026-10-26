const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const customWordRoutes = require("./routes/customRoutes");
const analysisRoutes = require("./routes/analysisRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activityRoutes");
const faceRoutes = require("./routes/faceRoutes");
const passkeyRoutes = require("./routes/passkeyRoutes");
const githubRoutes = require("./routes/githubRoutes");

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "toxicguard-default-jwt-secret-key-2026";

const app = express();
app.set("trust proxy", 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false,
  })
);

const normalizeOrigin = (url) =>
  typeof url === "string" ? url.trim().replace(/\/+$/, "") : "";

const configuredOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://toxic-guard-iota.vercel.app",
  normalizeOrigin(process.env.CLIENT_URL),
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = normalizeOrigin(origin);
      if (
        configuredOrigins.includes(clean) ||
        clean.endsWith(".vercel.app") ||
        clean.endsWith(".run.app") ||
        clean.endsWith(".ai.studio") ||
        clean.startsWith("http://localhost:") ||
        clean.startsWith("http://127.0.0.1:")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "200kb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Toxic Speech Detection API is running",
  });
});

app.get("/api", (req, res) => {
  res.json({
    status: "ok",
    message: "Toxic Speech Detection API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/custom-words", customWordRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/passkeys", passkeyRoutes);
app.use("/api/github", githubRoutes);

app.get("/test", (req, res) => {
  res.json({
    message: "Backend route is working",
  });
});

module.exports = app;