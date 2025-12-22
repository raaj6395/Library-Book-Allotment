import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import User from '../models/User.js';
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

// Create user (Admin only)
router.post('/',
  authenticate,
  requireAdmin,
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
    body('course').optional().trim(),
    body('batch').optional().trim(),
    body('specialization').optional().trim()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, email, registrationNumber, course, batch, specialization } = req.body;

      // Check if email already exists
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Check if registration number already exists
      const existingReg = await User.findOne({ registrationNumber });
      if (existingReg) {
        return res.status(400).json({ error: 'User with this registration number already exists' });
      }

      // Generate random password
      const tempPassword = crypto.randomBytes(8).toString('hex');

      const user = new User({
        name,
        email,
        registrationNumber,
        password: tempPassword,
        role: 'user',
        course: course || '',
        batch: batch || '',
        specialization: specialization || ''
      });

      await user.save();

      // Return user with temporary password (for printing)
      const userResponse = user.toObject();
      delete userResponse.password;
      res.status(201).json({
        ...userResponse,
        tempPassword // Include temp password for printing
      });
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        return res.status(400).json({ error: `User with this ${field} already exists` });
      }
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

