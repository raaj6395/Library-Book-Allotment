import express from "express";
import { body, validationResult } from "express-validator";
import { authenticate, requireAdmin } from "../middleware/auth.js";
import { requireActiveSession } from "../middleware/requireActiveSession.js";
import User from "../models/User.model.js";
import Student from "../models/Student.model.js";
import { addEmailToQueue } from "../emailWorker/emailService.js";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { libraryEmailTemplate } from "../utils/emailTemplates.js";

const router = express.Router();

router.get("/", authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

router.post(
  "/",
  authenticate,
  requireAdmin,
  requireActiveSession,
  [
    body("registration_number")
      .trim()
      .notEmpty()
      .withMessage("Registration number is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { registration_number } = req.body;
      const activeSession = req.activeSession;

      const student = await Student.findOne({
        registrationNumber: registration_number,
      });
      if (!student) {
        return res
          .status(404)
          .json({ error: "No student found with this registration number" });
      }

      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      const tempPassword = Array.from(crypto.randomBytes(10))
        .map((b) => chars[b % chars.length])
        .join("");

      const existingUser = await User.findOne({
        registrationNumber: registration_number,
      });

      if (existingUser) {
        // Same session → already created, reject
        if (existingUser.sessionId?.toString() === activeSession._id.toString()) {
          return res.status(409).json({
            error: "User already exists for this student in the current session",
          });
        }

        // Different (prior) session → re-activate for new session
        existingUser.sessionId = activeSession._id;
        existingUser.password = tempPassword;
        existingUser.name = student.name;
        existingUser.email = student.email;
        existingUser.course = student.course || existingUser.course;
        existingUser.batch = student.batch || existingUser.batch;
        existingUser.branch = student.branch || existingUser.branch;
        existingUser.cpi = student.cpi ?? existingUser.cpi;
        await existingUser.save();

        const emailBody = `
<p>Dear ${student.name},</p>

<p>Your account has been re-activated for the <strong>Library Book Allotment System</strong> for the new semester.</p>

<p>
<strong>Email:</strong> ${student.email}<br>
<strong>New Temporary Password:</strong> ${tempPassword}
</p>

<p>Please login with your new credentials.</p>
`;
        const html = libraryEmailTemplate({
          title: "Library System Account Re-activated",
          body: emailBody,
        });

        await addEmailToQueue({
          sendToEmail: student.email,
          title: "Library System Credentials - Central Library, MNNIT",
          subject: html,
        });

        const userResponse = existingUser.toObject();
        delete userResponse.password;
        return res.status(200).json({ ...userResponse, tempPassword });
      }

      const user = new User({
        name: student.name,
        email: student.email,
        registrationNumber: student.registrationNumber,
        password: tempPassword,
        role: "user",
        course: student.course || "",
        batch: student.batch || "",
        branch: student.branch || "",
        cpi: student.cpi,
        sessionId: activeSession._id,
      });

      const emailBody = `
<p>Dear ${student.name},</p>

<p>Your account has been created for the <strong>Library Book Allotment System</strong>.</p>

<p>
<strong>Email:</strong> ${student.email}<br>
<strong>Temporary Password:</strong> ${tempPassword}
</p>

<p>Please login and change your password after first login.</p>
`;

      const html = libraryEmailTemplate({
        title: "Library System Account Created",
        body: emailBody,
      });

      await user.save();

      await addEmailToQueue({
        sendToEmail: student.email,
        title: "Library System Credentials - Central Library, MNNIT",
        subject: html,
      });

      const userResponse = user.toObject();
      delete userResponse.password;
      res.status(201).json({ ...userResponse, tempPassword });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.put(
  "/:id",
  authenticate,
  requireAdmin,
  [
    body("email").optional().isEmail().normalizeEmail(),
    body("name").optional().trim().notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const { name, email, course, batch, specialization } = req.body;

      if (name) user.name = name;
      if (email) {
        const existingEmail = await User.findOne({
          email,
          _id: { $ne: user._id },
        });
        if (existingEmail) {
          return res.status(400).json({ error: "Email already in use" });
        }
        user.email = email;
      }
      if (course !== undefined) user.course = course;
      if (batch !== undefined) user.batch = batch;
      if (specialization !== undefined) user.specialization = specialization;

      await user.save();
      const userResponse = user.toObject();
      delete userResponse.password;
      res.json(userResponse);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

router.delete("/:id", authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
