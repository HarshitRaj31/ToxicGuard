require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3000;

process.env.JWT_SECRET =
  process.env.JWT_SECRET || "toxicguard-default-jwt-secret-key-2026";
process.env.FACE_ENCRYPTION_KEY =
  process.env.FACE_ENCRYPTION_KEY ||
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

const startServer = async () => {
  try {
    mongoose.set("bufferCommands", false);

    if (process.env.MONGO_URI) {
      try {
        await mongoose.connect(process.env.MONGO_URI, {
          serverSelectionTimeoutMS: 3000,
        });
        console.log("MongoDB connected successfully.");
      } catch (dbErr) {
        console.warn(
          "MongoDB not connected — using in-memory store:",
          dbErr.message
        );
      }
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
