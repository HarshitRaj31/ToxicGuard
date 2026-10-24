const express = require("express");
const CustomWord = require("../models/customWords");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// View custom words — any visitor can view them
router.get("/",protect,adminOnly, async (req, res) => {
  try {
    const words = await CustomWord.find().sort({ createdAt: -1 });
    res.json(words);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch custom words" });
  }
});

// Add a custom banned word — admin only

router.post("/", protect, adminOnly, async (req, res) => {
  try {
    const rawWord = req.body?.word;

    if (typeof rawWord !== "string" || !rawWord.trim()) {
      return res.status(400).json({
        message: "Please enter a valid word.",
      });
    }

    const word = rawWord.trim().toLowerCase();

    if (word.length > 100) {
      return res.status(400).json({
        message: "Word cannot exceed 100 characters.",
      });
    }

    const existingWord = await CustomWord.findOne({ word });

    if (existingWord) {
      return res.status(409).json({
        message: "Word already exists.",
      });
    }

    const newWord = await CustomWord.create({ word });

    return res.status(201).json({
      message: "Custom word added successfully.",
      word: newWord,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Word already exists.",
      });
    }

    console.error("Add custom word error:", error);

    return res.status(500).json({
      message: "Failed to add custom word.",
    });
  }
});

// Delete a custom banned word — admin only
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const deletedWord = await CustomWord.findByIdAndDelete(req.params.id);

    if (!deletedWord) {
      return res.status(404).json({ message: "Word not found" });
    }

    res.json({ message: "Custom word deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete custom word" });
  }
});

module.exports = router;