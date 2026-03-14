import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import AllotmentArchive from '../models/AllotmentArchive.model.js';

const router = express.Router();

// GET /api/archive/:sessionId — Get archived allotment data for a past session
router.get('/:sessionId', authenticate, requireAdmin, async (req, res) => {
  try {
    const archives = await AllotmentArchive.find({
      sessionId: req.params.sessionId,
    }).sort({ createdAt: 1 });

    res.json(archives);
  } catch (error) {
    console.error('Error fetching archive:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
