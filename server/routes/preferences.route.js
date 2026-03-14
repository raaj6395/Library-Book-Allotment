import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import { requireActiveSession } from '../middleware/requireActiveSession.js';
import Preference from '../models/Preference.model.js';
import Session from '../models/Session.model.js';
import Book from '../models/Book.model.js';

const router = express.Router();

// GET /preferences/me — get the current user's preferences for the active session
router.get('/me', authenticate, requireActiveSession, async (req, res) => {
  try {
    const preference = await Preference.findOne({
      userId: req.user.id,
      sessionId: req.activeSession._id,
    }).populate('rankedBookIds', 'title author isbnOrBookId');

    if (!preference) {
      return res.json(null);
    }
    res.json(preference);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /preferences — submit preferences for the active session
router.post('/',
  authenticate,
  requireActiveSession,
  [
    body('rankedBookIds').isArray({ min: 1, max: 10 }).withMessage('Must provide 1-10 book preferences'),
    body('rankedBookIds.*').isMongoId().withMessage('Invalid book ID')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { rankedBookIds } = req.body;
      const activeSession = req.activeSession;

      const books = await Book.find({ _id: { $in: rankedBookIds } });
      if (books.length !== rankedBookIds.length) {
        return res.status(400).json({ error: 'One or more books not found' });
      }

      const existing = await Preference.findOne({
        userId: req.user.id,
        sessionId: activeSession._id,
      });

      if (existing) {
        return res.status(409).json({
          error: 'Preferences already submitted and cannot be updated'
        });
      }

      const preference = new Preference({
        userId: req.user.id,
        rankedBookIds,
        sessionId: activeSession._id,
      });

      await preference.save();
      await preference.populate('rankedBookIds', 'title author isbnOrBookId');

      res.json(preference);
    } catch (error) {
      console.error('Error saving preferences:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// GET /preferences/all — admin: get all preferences (filtered by active session by default)
router.get('/all', authenticate, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const filter = {};

    if (req.query.sessionId) {
      filter.sessionId = req.query.sessionId;
    } else {
      const activeSession = await Session.findOne({ status: 'ACTIVE' });
      if (activeSession) {
        filter.sessionId = activeSession._id;
      }
    }

    const preferences = await Preference.find(filter)
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
