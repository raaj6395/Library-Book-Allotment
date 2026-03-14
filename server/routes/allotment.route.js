import express from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Allotment from '../models/Allotment.model.js';
import AllotmentEvent from '../models/AllotmentEvent.model.js';
import AllotmentMeta from '../models/AllotmentMeta.model.js';
import Book from '../models/Book.model.js';
import Session from '../models/Session.model.js';
import User from '../models/User.model.js';
import { executeAllotment } from '../utils/allotmentLogic.js';

const router = express.Router();

// POST /allotment/run — backward-compatible route (no session required)
router.post('/run', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      course,
      year,
      semesterType = 'Even',
      semesterYear = new Date().getFullYear(),
    } = req.body;

    if (!course || !year) {
      return res.status(400).json({ error: 'course and year are required' });
    }

    const event = new AllotmentEvent({
      runByAdminId: req.user.id,
      course,
      year,
      semesterType,
      semesterYear,
      sessionId: null,
    });
    await event.save();

    const { totalAllocations, results } = await executeAllotment({
      event,
      course,
      year,
      semesterType,
      semesterYear,
      sessionId: null,
    });

    res.json({
      eventId: event._id,
      runAt: event.runAt,
      course,
      year,
      totalAllocations,
      totalWaitlists: 0,
      results,
    });
  } catch (error) {
    console.error('Error running allotment:', error);
    res.status(500).json({ error: 'Server error during allotment' });
  }
});

// POST /allotment/reset-tokens — reset serial counters for a semester
router.post('/reset-tokens', authenticate, requireAdmin, async (req, res) => {
  try {
    const {
      semesterType = 'Even',
      semesterYear = new Date().getFullYear(),
    } = req.body;
    const semKey = `${semesterType}-${semesterYear}`;
    await AllotmentMeta.findOneAndUpdate(
      { semesterKey: semKey },
      { $set: { btechSerial: 0, mcaSerial: 0 } },
      { upsert: true }
    );
    res.json({ message: `Token counters reset for ${semKey}` });
  } catch (error) {
    console.error('Error resetting tokens:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/slip/:regNo — generate allotment slip for a student
router.get('/slip/:regNo', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ registrationNumber: req.params.regNo });
    if (!user) return res.status(404).json({ error: 'Student not found' });

    const latestEvent = await AllotmentEvent.findOne().sort({ runAt: -1 });
    if (!latestEvent) return res.status(404).json({ error: 'No allotment event found' });

    const allotments = await Allotment.find({
      userId: user._id,
      status: 'allotted',
    })
      .populate('bookId', 'title author classNo isbnOrBookId')
      .populate('eventId', 'runAt semesterType semesterYear course year')
      .sort({ createdAt: 1 });

    res.json({
      student: {
        name: user.name,
        registrationNumber: user.registrationNumber,
        branch: user.branch,
        course: user.course,
        batch: user.batch,
        email: user.email,
      },
      allotments: allotments.map(a => ({
        _id: a._id,
        tokenNumber: a.tokenNumber,
        book: a.bookId,
        allotmentDate: a.createdAt,
        semesterType: a.eventId?.semesterType,
        semesterYear: a.eventId?.semesterYear,
        returned: a.returned,
      })),
    });
  } catch (error) {
    console.error('Error fetching slip:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/report/:eventId — download Excel report
router.get('/report/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await AllotmentEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const allotments = await Allotment.find({
      eventId: req.params.eventId,
      status: 'allotted',
    })
      .populate('userId', 'name registrationNumber course batch branch cpi')
      .populate('bookId', 'title author classNo isbnOrBookId');

    const byUser = {};
    for (const a of allotments) {
      if (!a.userId || !a.bookId) continue;
      const uid = a.userId._id.toString();
      if (!byUser[uid]) {
        byUser[uid] = { user: a.userId, tokenNumber: a.tokenNumber, books: [] };
      }
      byUser[uid].books.push(a.bookId);
    }

    const rows = Object.values(byUser).sort((a, b) => {
      const branchCmp = (a.user.branch || '').localeCompare(b.user.branch || '');
      if (branchCmp !== 0) return branchCmp;
      return (a.user.batch || '').localeCompare(b.user.batch || '');
    });

    const workbook = new ExcelJS.Workbook();
    const sheet1 = workbook.addWorksheet('Students');
    sheet1.addRow([
      'Token No', 'Reg No', 'Name', 'Course', 'Year', 'Branch', 'CPI',
      'Book 1', 'Book 2', 'Book 3', 'Book 4', 'Book 5',
    ]);
    for (const { user, tokenNumber, books } of rows) {
      const bookCols = [...books.map(b => b.title), '', '', '', '', ''].slice(0, 5);
      sheet1.addRow([
        tokenNumber || '',
        user.registrationNumber || '',
        user.name || '',
        user.course || '',
        user.batch || '',
        user.branch || '',
        user.cpi ?? '',
        ...bookCols,
      ]);
    }

    const allBooks = await Book.find().sort({ classNo: 1, title: 1 });
    const sheet2 = workbook.addWorksheet('Books');
    sheet2.addRow(['Class No', 'Book ID', 'Title', 'Author', 'Total Copies', 'Available Copies', 'Status']);
    for (const b of allBooks) {
      sheet2.addRow([
        b.classNo || '',
        b.isbnOrBookId,
        b.title,
        b.author || '',
        b.totalCopies,
        b.availableCopies,
        b.availableCopies === 0 ? 'Unavailable' : 'Available',
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="allotment-report-${req.params.eventId}.xlsx"`,
    });
    res.send(buffer);
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ error: 'Server error generating report' });
  }
});

// GET /allotment/results/:eventId
router.get('/results/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const results = await Allotment.find({ eventId: req.params.eventId })
      .populate('userId', 'name email registrationNumber course batch branch cpi')
      .populate('bookId', 'title author isbnOrBookId classNo')
      .sort({ createdAt: 1 });

    results.sort((a, b) => {
      const branchCmp = (a.userId?.branch || '').localeCompare(b.userId?.branch || '');
      if (branchCmp !== 0) return branchCmp;
      return (a.userId?.batch || '').localeCompare(b.userId?.batch || '');
    });

    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/events
router.get('/events', authenticate, requireAdmin, async (_req, res) => {
  try {
    const events = await AllotmentEvent.find()
      .populate('runByAdminId', 'name email')
      .populate('sessionId', 'year semesterType status')
      .sort({ runAt: -1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/my-allocation — session-aware: show allocations for the active session
router.get('/my-allocation', authenticate, async (req, res) => {
  try {
    const activeSession = await Session.findOne({ status: 'ACTIVE' });

    const allotmentFilter = { userId: req.user.id, status: 'allotted' };

    if (activeSession) {
      // Find events linked to the active session
      const sessionEvents = await AllotmentEvent.find({ sessionId: activeSession._id }).select('_id');
      if (sessionEvents.length > 0) {
        allotmentFilter.eventId = { $in: sessionEvents.map(e => e._id) };
      } else {
        // No events yet for this session — return empty
        return res.json([]);
      }
    } else {
      // No active session: fall back to the globally latest event
      const latestEvent = await AllotmentEvent.findOne().sort({ runAt: -1 });
      if (!latestEvent) return res.json([]);
      allotmentFilter.eventId = latestEvent._id;
    }

    const allocations = await Allotment.find(allotmentFilter)
      .populate('bookId', 'title author isbnOrBookId category classNo');

    res.json(allocations);
  } catch (error) {
    console.error('Error fetching user allocation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/returns/:regNo — fetch student's allotted books for return
router.get('/returns/:regNo', authenticate, requireAdmin, async (req, res) => {
  try {
    const user = await User.findOne({ registrationNumber: req.params.regNo });
    if (!user) return res.status(404).json({ error: 'Student not found' });

    const allotments = await Allotment.find({
      userId: user._id,
      status: 'allotted',
    })
      .populate('bookId', 'title author classNo isbnOrBookId')
      .populate('eventId', 'runAt semesterType semesterYear')
      .sort({ createdAt: -1 });

    res.json({
      student: {
        _id: user._id,
        name: user.name,
        registrationNumber: user.registrationNumber,
        branch: user.branch,
        course: user.course,
        batch: user.batch,
      },
      allotments: allotments.map(a => ({
        _id: a._id,
        tokenNumber: a.tokenNumber,
        book: a.bookId,
        allotmentDate: a.createdAt,
        returned: a.returned,
        returnedAt: a.returnedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching return info:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /allotment/return/:allotmentId — mark a book as returned
router.post('/return/:allotmentId', authenticate, requireAdmin, async (req, res) => {
  try {
    const allotment = await Allotment.findById(req.params.allotmentId);
    if (!allotment) return res.status(404).json({ error: 'Allotment record not found' });
    if (allotment.returned) return res.status(400).json({ error: 'Book already marked as returned' });

    allotment.returned = true;
    allotment.returnedAt = new Date();
    await allotment.save();

    await Book.findByIdAndUpdate(allotment.bookId, { $inc: { availableCopies: 1 } });

    res.json({ message: 'Book marked as returned', allotment });
  } catch (error) {
    console.error('Error marking book returned:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/non-returned-report — download Excel of non-returned books
router.get('/non-returned-report', authenticate, requireAdmin, async (req, res) => {
  try {
    const allotments = await Allotment.find({ status: 'allotted', returned: false })
      .populate('userId', 'name registrationNumber branch batch course')
      .populate('bookId', 'title classNo isbnOrBookId')
      .sort({ createdAt: 1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Non-Returned Books');
    sheet.addRow(['Reg No', 'Name', 'Branch', 'Year', 'Book Title', 'Class No', 'Token Number', 'Allotment Date']);

    for (const a of allotments) {
      if (!a.userId || !a.bookId) continue;
      sheet.addRow([
        a.userId.registrationNumber || '',
        a.userId.name || '',
        a.userId.branch || '',
        a.userId.batch || '',
        a.bookId.title || '',
        a.bookId.classNo || '',
        a.tokenNumber || '',
        a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '',
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="non-returned-books.xlsx"',
    });
    res.send(buffer);
  } catch (error) {
    console.error('Error generating non-returned report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
