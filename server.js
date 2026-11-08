require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const newsRoutes = require("./routes/newsRoutes");
const authRoutes = require("./routes/authRoutes");
const app = express();
const cors = require("cors");

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3001").split(",");
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "News API is running" });
});

// Every route in newsRoutes starts with /api/news
app.use("/api/news", newsRoutes);
app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 3000;

// Start the server only after the database connection is ready
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  });