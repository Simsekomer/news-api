const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: String,
  content: String,
  link: String,
  published_at: Date,
  source: String,
  category: String,
  image_url: String,
  scraped_at: Date,
});

// Third argument: use the existing "news" collection created by the bot
module.exports = mongoose.model("News", newsSchema, "news");