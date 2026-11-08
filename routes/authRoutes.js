const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const sendMail = require("../utils/mailer");

const router = express.Router();

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;
const RESET_CODE_MINUTES = 10;
const MAX_RESET_ATTEMPTS = 5;

function hashCode(code) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function clearResetCode(user) {
  user.resetPasswordCode = undefined;
  user.resetPasswordExpires = undefined;
  user.resetPasswordAttempts = 0;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ message: "Invalid email address" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(409).json({ message: "This email is already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashedPassword });

    res.status(201).json({
      message: "User registered",
      user: { id: user._id, email: user.email },
    });
  } catch (error) {
    res.status(500).json({ message: "Could not register user" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Could not log in" });
  }
});

// POST /api/auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body || {};

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  // Same answer whether the email exists or not
  const message = "If this email is registered, a reset code has been sent";

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.json({ message });
    }

    // 6-digit code between 100000 and 999999
    const code = crypto.randomInt(100000, 1000000).toString();

    user.resetPasswordCode = hashCode(code);
    user.resetPasswordExpires = new Date(Date.now() + RESET_CODE_MINUTES * 60 * 1000);
    user.resetPasswordAttempts = 0;
    await user.save();

    try {
      await sendMail(
        user.email,
        "Your password reset code",
        `<p>Your Maritime News password reset code is:</p>
         <h2 style="letter-spacing: 4px;">${code}</h2>
         <p>This code is valid for ${RESET_CODE_MINUTES} minutes.
            If you did not request this, you can ignore this email.</p>`
      );
    } catch (mailError) {
      clearResetCode(user);
      await user.save();
      return res.status(500).json({ message: "Could not send reset email" });
    }

    res.json({ message });
  } catch (error) {
    res.status(500).json({ message: "Could not process request" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  const { email, code, password } = req.body || {};

  if (!email || !code || !password) {
    return res.status(400).json({ message: "Email, code and new password are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  const invalidMessage = "Code is invalid or has expired";

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user || !user.resetPasswordCode || user.resetPasswordExpires < new Date()) {
      return res.status(400).json({ message: invalidMessage });
    }

    if (user.resetPasswordAttempts >= MAX_RESET_ATTEMPTS) {
      clearResetCode(user);
      await user.save();
      return res.status(400).json({ message: "Too many attempts. Please request a new code" });
    }

    if (hashCode(String(code).trim()) !== user.resetPasswordCode) {
      user.resetPasswordAttempts += 1;
      await user.save();
      return res.status(400).json({ message: invalidMessage });
    }

    user.password = await bcrypt.hash(password, 10);
    clearResetCode(user);
    await user.save();

    res.json({ message: "Password has been reset" });
  } catch (error) {
    res.status(500).json({ message: "Could not reset password" });
  }
});

module.exports = router;