const express=require("express");
const cors=require("cors");
const helmet = require("helmet");
const customWordRoutes=require("./routes/customRoutes");
const analysisRoutes=require("./routes/analysisRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const activityRoutes = require("./routes/activityRoutes");
const faceRoutes = require("./routes/faceRoutes");
const passkeyRoutes = require("./routes/passkeyRoutes");
const app=express();
app.use(helmet());

const allowedOrigins = [
  "http://localhost:5173",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  })
);

app.use(express.json({ limit: "20kb" }));
app.get("/",(req, res) => {
  res.json({
    message:"Toxic Speech Detection API is running"
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/custom-words", customWordRoutes);
app.use("/api/analysis", analysisRoutes);
app.use("/api/users", userRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/face", faceRoutes);
app.use("/api/passkeys", passkeyRoutes);
app.get("/test", (req, res) => {
  res.json({
    message: "Backend route is working"
  });
});
module.exports = app;