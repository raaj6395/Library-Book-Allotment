import express from "express";
import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

const router = express.Router();

router.post(
  "/login",
  [body("email").isEmail().normalizeEmail(), body("password").notEmpty()],
  async (req, res) => {
    try {
      console.log("Login request received");
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: "no user found with this email" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.error("Password mismatch for user:", email);
        return res.status(401).json({ error: "invalid password" });
      }

      // Sign a JWT and return it with user info
      const token = jwt.sign(
        { id: user._id.toString(), email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
      );

      res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          registrationNumber: user.registrationNumber,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Server error during login" });
    }
  },
);

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !String(authHeader).startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authorization header required" });
    }

    const token = String(authHeader).split(" ")[1];
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      return res.json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        registrationNumber: user.registrationNumber,
      });
    } catch (err) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
  } catch (error) {
    res.status(401).json({ error: "Authentication failed" });
  }
});

export default router;
