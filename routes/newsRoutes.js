const express = require("express");
const News = require("../models/News");
const requireAuth = require("../middleware/auth");

const router = express.Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// GET /api/news?days=10&source=TRT Haber&limit=20
router.get("/", requireAuth, async (req, res) => {
  const { days, source, limit } = req.query;
  const filter = {};

  // Only articles published in the last N days
  if (days) {
    const dayCount = Number(days);
    if (!Number.isInteger(dayCount) || dayCount <= 0) {
      return res.status(400).json({ message: "days must be a positive whole number" });
    }
    const startDate = new Date(Date.now() - dayCount * 24 * 60 * 60 * 1000);
    filter.published_at = { $gte: startDate };
  }

  // Only articles from the given source
  if (source) {
    filter.source = source;
  }

  const resultLimit = Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT);

  try {
    const news = await News.find(filter)
      .sort({ published_at: -1 })
      .limit(resultLimit);

    res.json({ count: news.length, news });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch news" });
  }
});

module.exports = router;