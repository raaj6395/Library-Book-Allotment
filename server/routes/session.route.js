import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireActiveSession } from '../middleware/requireActiveSession.js';
import Session from '../models/Session.model.js';
import AllotmentEvent from '../models/AllotmentEvent.model.js';
import User from '../models/User.model.js';
import { executeAllotment } from '../utils/allotmentLogic.js';

const router = express.Router();

// POST /api/admin/session — Create a new ACTIVE session
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { year, semesterType } = req.body;

    if (!year || !semesterType) {
      return res.status(400).json({ error: 'year and semesterType are required' });
    }
    if (!['ODD', 'EVEN'].includes(semesterType)) {
      return res.status(400).json({ error: 'semesterType must be ODD or EVEN' });
    }
    if (typeof year !== 'number' || !Number.isInteger(year) || year < 2000) {
      return res.status(400).json({ error: 'year must be a valid integer (e.g. 2026)' });
    }

    const existing = await Session.findOne({ status: 'ACTIVE' });
    if (existing) {
      return res.status(400).json({
        error: `An active session already exists: ${existing.semesterType} ${existing.year}`,
        session: existing,
      });
    }

    const session = new Session({ year, semesterType, status: 'ACTIVE' });
    await session.save();

    res.status(201).json({ session });
  } catch (error) {
    if (error.message === 'An active session already exists') {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/session/active — Get current active session (or null)
router.get('/active', authenticate, requireAdmin, async (_req, res) => {
  try {
    const session = await Session.findOne({ status: 'ACTIVE' });
    res.json({ session: session || null });
  } catch (error) {
    console.error('Error fetching active session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/session/run-allotment — Run allotment for the active session
router.post('/run-allotment', authenticate, requireAdmin, requireActiveSession, async (req, res) => {
  try {
    const session = req.activeSession;
    const { course, year } = req.body;

    if (!course || !year) {
      return res.status(400).json({ error: 'course and year are required' });
    }

    // Session.semesterType is 'ODD'/'EVEN'; AllotmentEvent.semesterType is 'Odd'/'Even'
    const eventSemType = session.semesterType === 'ODD' ? 'Odd' : 'Even';

    const event = new AllotmentEvent({
      runByAdminId: req.user.id,
      course,
      year,
      semesterType: eventSemType,
      semesterYear: session.year,
      sessionId: session._id,
    });
    await event.save();

    const { totalAllocations, results } = await executeAllotment({
      event,
      course,
      year,
      semesterType: eventSemType,
      semesterYear: session.year,
      sessionId: session._id,
    });

    res.json({
      eventId: event._id,
      runAt: event.runAt,
      course,
      year,
      semesterType: eventSemType,
      semesterYear: session.year,
      totalAllocations,
      totalWaitlists: 0,
      results,
    });
  } catch (error) {
    console.error('Error running session allotment:', error);
    res.status(500).json({ error: 'Server error during allotment' });
  }
});

// POST /api/admin/session/end — End the active session
router.post('/end', authenticate, requireAdmin, requireActiveSession, async (req, res) => {
  try {
    const session = req.activeSession;

    session.status = 'COMPLETED';
    session.endedAt = new Date();
    await session.save();

    res.json({ message: 'Session ended successfully', session });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/session/history — List all sessions with counts
router.get('/history', authenticate, requireAdmin, async (_req, res) => {
  try {
    const sessions = await Session.find().sort({ createdAt: -1 });

    const enriched = await Promise.all(
      sessions.map(async (s) => {
        const [eventCount, userCount] = await Promise.all([
          AllotmentEvent.countDocuments({ sessionId: s._id }),
          User.countDocuments({ sessionId: s._id, role: 'user' }),
        ]);
        return { ...s.toObject(), eventCount, userCount };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
