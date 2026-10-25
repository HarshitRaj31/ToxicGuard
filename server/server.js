
require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing from the environment.");
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is missing from the environment.");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully.");

    app.listen(PORT, "0.0.0.0",() => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
