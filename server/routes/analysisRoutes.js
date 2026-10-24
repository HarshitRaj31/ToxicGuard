const express = require("express");
const axios = require("axios");
const Analysis = require("../models/analysis");
const CustomWord = require("../models/customWords");
const Activity = require("../models/Activity");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/",protect, async (req, res) => {
  try {
   const { comment } = req.body || {};

if (typeof comment !== "string" || !comment.trim()) {
  return res.status(400).json({
    message: "Please provide a valid comment.",
  });
}

if (comment.trim().length > 5000) {
  return res.status(400).json({
    message: "Comment cannot exceed 5000 characters.",
  });
}

    const text = comment.trim().toLowerCase();

    // Get custom words
    const customWords = await CustomWord.find();

    const matchedWord = customWords.find((item) => {
  const word = item.word?.trim().toLowerCase();

  if (!word) return false;

  // Match the whole word or phrase, not an accidental substring.
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(^|\\W)${escapedWord}(?=\\W|$)`, "i");

  return pattern.test(text);
});

    let result;
    let category;
    let confidence;
    let detectedLabels = [];
    // Custom word has priority
    if (matchedWord) {
      result = "Toxic";
      category = "Custom Banned Word";
      confidence = 98;
      detectedLabels = ["custom_banned_word"];
    } else {

      // Send comment to Python AI model
      const aiResponse = await axios.post(
        "http://localhost:8000/predict",
        {
          text: comment.trim(),
        }
      );

      result = aiResponse.data.result;
      confidence = aiResponse.data.confidence;
      detectedLabels = aiResponse.data.detectedLabels || [];
      // Category based on AI result
      if (result === "Safe") {
        category = "Non-Toxic";
      } else if (result === "Hate Speech") {
        category = "Hate Speech";
      } else if (result === "Offensive") {
        category = "Offensive";
      } else {
        category = "Toxic";
      }
    }

    // Save result to MongoDB
    const analysis = await Analysis.create({
      user: req.user._id,
      comment: comment.trim(),
      result,
      category,
      confidence,
      detectedLabels,
    });
    try {
  await Activity.create({
    user: req.user._id,
    userName: req.user.name,
    userEmail: req.user.email,
    action: "ANALYSIS",
    details: `Comment analyzed. Result: ${result}; Category: ${category}`,
    ipAddress: req.ip,
  });
} catch (activityError) {
  console.error(
    "Analysis activity logging failed:",
    activityError.message
  );
}
    return res.status(201).json(analysis);

  } catch (error) {
    console.error("Analysis Error:", error);

    return res.status(500).json({
      message: "Failed to analyze comment.Please try again",
      
    });
  }
});
// GET all analysis history

 // GET analysis history
router.get("/", protect, async (req, res) => {
  try {
    // Admins can view all records.
    // Regular users can view only their own records.
    const filter =
      req.user.role === "admin"
        ? {}
        : { user: req.user._id };

    const analyses = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(analyses);
  } catch (error) {
    console.error("History Error:", error);

    return res.status(500).json({
      message: "Failed to fetch analysis history.",
    });
  }
});

// GET dashboard statistics

// Export analysis history as CSV
router.get("/export/csv",protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid start date.",
          });
        }

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid end date.",
          });
        }

        filter.createdAt.$lte = end;
      }

      if (startDate && endDate && startDate > endDate) {
        return res.status(400).json({
          message: "Start date cannot be after end date.",
        });
      }
    }

    const records = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    const escapeCSV = (value) => {
      const text = Array.isArray(value)
        ? value.join(", ")
        : value == null
          ? ""
          : String(value);

      // Prevent spreadsheet formula injection.
      const safeText = /^[\s]*[=+\-@]/.test(text)
        ? `'${text}`
        : text;

      return `"${safeText.replace(/"/g, '""')}"`;
    };

    const headers = [
      "Date",
      "Comment",
      "Result",
      "Category",
      "Confidence",
      "Detected Labels",
    ];

    const rows = records.map((record) => [
      record.createdAt
        ? new Date(record.createdAt).toISOString()
        : "",
      record.comment,
      record.result,
      record.category,
      record.confidence,
      record.detectedLabels,
    ]);

    const csv = [
      headers.map(escapeCSV).join(","),
      ...rows.map((row) => row.map(escapeCSV).join(",")),
    ].join("\r\n");

    res.setHeader(
      "Content-Type",
      "text/csv; charset=utf-8"
    );

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="toxic-detection-report.csv"'
    );

    res.send("\uFEFF" + csv);
  } catch (error) {
    console.error("CSV export error:", error);

    res.status(500).json({
      message: "Failed to export analysis report.",
    });
  }
});
// Get analysis records for PDF export
router.get("/export/data",protect, adminOnly, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = {};

    if (
      startDate &&
      endDate &&
      startDate > endDate
    ) {
      return res.status(400).json({
        message: "Start date cannot be after end date.",
      });
    }

    if (startDate || endDate) {
      filter.createdAt = {};

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00.000Z`);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            message: "Invalid start date.",
          });
        }

        filter.createdAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999Z`);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            message: "Invalid end date.",
          });
        }

        filter.createdAt.$lte = end;
      }
    }

    const records = await Analysis.find(filter)
      .sort({ createdAt: -1 })
      .select(
        "comment result category confidence detectedLabels createdAt"
      )
      .lean();

    res.json(records);
  } catch (error) {
    console.error("PDF data export error:", error);

    res.status(500).json({
      message: "Failed to retrieve PDF report data.",
    });
  }
});

router.get("/stats", protect, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};

    if (startDate) {
      const start = new Date(`${startDate}T00:00:00.000Z`);

      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ message: "Invalid start date." });
      }

      dateFilter.$gte = start;
    }

    if (endDate) {
      const end = new Date(`${endDate}T23:59:59.999Z`);

      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({ message: "Invalid end date." });
      }

      dateFilter.$lte = end;
    }

    if (startDate && endDate && startDate > endDate) {
      return res.status(400).json({
        message: "Start date cannot be after end date.",
      });
    }

    const match = {
  ...(startDate || endDate ? { createdAt: dateFilter } : {}),
  ...(req.user.role === "admin"
    ? {}
    : { user: req.user._id }),
};

    const totalAnalyses = await Analysis.countDocuments(match);

    const toxicComments = await Analysis.countDocuments({
      ...match,
      result: "Toxic",
    });

    const safeComments = await Analysis.countDocuments({
      ...match,
      result: "Safe",
    });

    const categoryCounts = await Analysis.aggregate([
      { $match: match },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ]);

    const categoryTotals = categoryCounts.reduce((totals, item) => {
      if (item._id) totals[item._id] = item.count;
      return totals;
    }, {});

    
const categories = {
  toxic: categoryTotals.Toxic || 0,
  offensive: categoryTotals.Offensive || 0,
  threat: categoryTotals.Threat || 0,
  insult: categoryTotals.Insult || 0,
  hateSpeech: categoryTotals["Hate Speech"] || 0,
  customBannedWord: categoryTotals["Custom Banned Word"] || 0,
};


    const dailyAnalyses = await Analysis.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          total: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Only admins can see recent analysis records.
    // Admins see all recent analyses.
// Regular users see only their own recent analyses.
const recentMatch =
  req.user.role === "admin"
    ? match
    : { ...match, user: req.user._id };

const recentAnalyses = await Analysis.find(recentMatch)
  .sort({ createdAt: -1 })
  .limit(5)
  .lean();

    return res.json({
      totalAnalyses,
      toxicComments,
      safeComments,
      categories,
      recentAnalyses,
      dailyAnalyses,
    });
  } catch (error) {
    console.error("Stats error:", error);

    return res.status(500).json({
      message: "Failed to fetch analysis statistics.",
    });
  }
});

module.exports = router;
