import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';

const router = express.Router();

// Login
router.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      console.log('Login request received');
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ error: 'no user found with this email' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        console.error('Password mismatch for user:', email);
        return res.status(401).json({ error: 'invalid password' });
      }

      res.json({
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          registrationNumber: user.registrationNumber
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error during login' });
    }
  }
);

// Get current user (requires email and password in headers)
router.get('/me', async (req, res) => {
  try {
    const email = req.headers['x-user-email'];
    const password = req.headers['x-user-password'];

    if (!email || !password) {
      return res.status(401).json({ error: 'Email and password required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      registrationNumber: user.registrationNumber
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed' });
  }
});

export default router;

