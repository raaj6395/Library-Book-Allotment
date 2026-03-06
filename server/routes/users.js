import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
import Student from '../models/Student.js';
import { addEmailToQueue } from '../emailWorker/emailService.js';
import crypto from 'crypto';

const router = express.Router();

// Get all users (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single user (Admin only)
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create user (Admin only) — looks up student by registration number
router.post('/',
  authenticate,
  requireAdmin,
  [
    body('registration_number').trim().notEmpty().withMessage('Registration number is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { registration_number } = req.body;

      // Look up student
      const student = await Student.findOne({ registrationNumber: registration_number });
      if (!student) {
        return res.status(404).json({ error: 'No student found with this registration number' });
      }

      // Check if user already exists for this student
      const existingUser = await User.findOne({ registrationNumber: registration_number });
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists for this student' });
      }

      // Generate secure 10-char alphanumeric password
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      const tempPassword = Array.from(crypto.randomBytes(10))
        .map(b => chars[b % chars.length])
        .join('');

      const user = new User({
        name: student.name,
        email: student.email,
        registrationNumber: student.registrationNumber,
        password: tempPassword,
        role: 'user',
        course: student.course || '',
        batch: student.batch || '',
        branch: student.branch || '',
        cpi: student.cpi,
      });

      await user.save();

      // Send credentials email (fire-and-forget)
      await addEmailToQueue({
        sendToEmail: student.email,
        title: 'Your Library System Credentials',
        subject: `<p>Hello ${student.name},</p>
<p>Your account has been created for the Library Book Allotment System.</p>
<p><strong>Email:</strong> ${student.email}<br>
<strong>Password:</strong> ${tempPassword}</p>
<p>Please log in and change your password after first login.</p>`,
      });

      const userResponse = user.toObject();
      delete userResponse.password;
      res.status(201).json({ ...userResponse, tempPassword });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update user (Admin only)
router.put('/:id',
  authenticate,
  requireAdmin,
  [
    body('email').optional().isEmail().normalizeEmail(),
    body('name').optional().trim().notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const { name, email, course, batch, specialization } = req.body;

      if (name) user.name = name;
      if (email) {
        const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
        if (existingEmail) {
          return res.status(400).json({ error: 'Email already in use' });
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
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete user (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

