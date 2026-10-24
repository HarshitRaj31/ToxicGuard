
const express = require("express");
const Activity = require("../models/Activity");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/activity — Admin only
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const totalActivities = await Activity.countDocuments();
    const totalPages = Math.ceil(totalActivities / limit);

    const activities = await Activity.find()
      .populate("user", "name email")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.status(200).json({
      activities,
      pagination: {
        totalActivities,
        currentPage: page,
        totalPages,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    });
  } catch (error) {
    console.error("Fetch activities error:", error.message);
    res.status(500).json({ message: "Unable to fetch activity logs." });
  }
});

module.exports = router;
