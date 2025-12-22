import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import Preference from '../models/Preference.js';
import Book from '../models/Book.js';

const router = express.Router();

// Get user's preferences
router.get('/me', authenticate, async (req, res) => {
  try {
    const preference = await Preference.findOne({ userId: req.user.id })
      .populate('rankedBookIds', 'title author isbnOrBookId');
    
    if (!preference) {
      return res.json(null);
    }
    res.json(preference);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit/Update preferences
router.post('/',
  authenticate,
  [
    body('rankedBookIds').isArray({ min: 1, max: 5 }).withMessage('Must provide 1-5 book preferences'),
    body('rankedBookIds.*').isMongoId().withMessage('Invalid book ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rankedBookIds } = req.body;

      // Verify all books exist
      const books = await Book.find({ _id: { $in: rankedBookIds } });
      if (books.length !== rankedBookIds.length) {
        return res.status(400).json({ error: 'One or more books not found' });
      }

      // Check if user already has preferences
      let preference = await Preference.findOne({ userId: req.user.id });

      if (preference) {
        // Update existing preferences
        preference.rankedBookIds = rankedBookIds;
        preference.submittedAt = new Date();
      } else {
        // Create new preferences
        preference = new Preference({
          userId: req.user.id,
          rankedBookIds
        });
      }

      await preference.save();
      await preference.populate('rankedBookIds', 'title author isbnOrBookId');

      res.json(preference);
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Get all preferences (Admin only)
router.get('/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const preferences = await Preference.find()
      .populate('userId', 'name email registrationNumber')
      .populate('rankedBookIds', 'title author isbnOrBookId')
      .sort({ submittedAt: -1 });

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching all preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

