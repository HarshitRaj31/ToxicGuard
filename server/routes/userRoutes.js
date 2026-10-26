
const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/user");
const Activity = require("../models/Activity");
const {
  protect,
  adminOnly,
} = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/users — Get users with search, role filter, and pagination
router.get("/", protect, adminOnly, async (req, res) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search : "";
    const role = typeof req.query.role === "string" ? req.query.role : "all";

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10)
    );

    const filter = {};

    if (search.trim()) {
      const escapedSearch = search.trim().replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      filter.$or = [
        { name: { $regex: escapedSearch, $options: "i" } },
        { email: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    if (["user", "admin"].includes(role)) {
      filter.role = role;
    }

    const totalUsers = await User.countDocuments(filter);
    const totalPages = Math.ceil(totalUsers / limit);

    const users = await User.find(filter)
      .select("-password")
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return res.status(200).json({
      totalUsers,
      users,
      pagination: {
        totalUsers,
        currentPage: page,
        totalPages,
        pageSize: limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && totalPages > 0,
      },
    });
  } catch (error) {
    console.error("Fetch users error:", error.message);

    return res.status(500).json({
      message: "Failed to fetch users.",
    });
  }
});

// DELETE /api/users/:id — Delete a user (admin only)
router.delete("/:id", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid user ID.",
      });
    }

    // Prevent an admin from deleting their own account
    if (id === req.user._id.toString()) {
      return res.status(400).json({
        message: "You cannot delete your own account.",
      });
    }

    const targetUser = await User.findById(id);

    if (!targetUser) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Prevent deleting the last admin account
    if (targetUser.role === "admin") {
      const adminCount = await User.countDocuments({ role: "admin" });

      if (adminCount <= 1) {
        return res.status(400).json({
          message: "Cannot delete the last admin account.",
        });
      }
    }

    await User.findByIdAndDelete(id);

    // Record the deletion in Activity Logs
    try {
      await Activity.create({
        user: req.user._id,
        userName: req.user.name,
        userEmail: req.user.email,
        action: "DELETE_USER",
        details: `Admin deleted user ${targetUser.email}`,
        ipAddress: req.ip,
      });
    } catch (activityError) {
      console.error(
        "Delete activity logging failed:",
        activityError.message
      );
    }

    return res.status(200).json({
      message: "User deleted successfully.",
      deletedUserId: id,
    });
  } catch (error) {
    console.error("Delete user error:", error.message);

    return res.status(500).json({
      message: "Failed to delete user.",
    });
  }
});

module.exports = router;
