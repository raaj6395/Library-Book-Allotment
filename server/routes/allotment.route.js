import express from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Preference from '../models/Preference.model.js';
import Book from '../models/Book.model.js';
import Allotment from '../models/Allotment.model.js';
import AllotmentEvent from '../models/AllotmentEvent.model.js';
import AllotmentMeta from '../models/AllotmentMeta.model.js';
import User from '../models/User.model.js';
import { addEmailToQueue } from '../emailWorker/emailService.js';

const router = express.Router();

const MAX_BOOKS_PER_STUDENT = 5;

// Build semester key like "Even-2026"
function getSemesterKey(semesterType, semesterYear) {
  return `${semesterType}-${semesterYear}`;
}

// Generate token number for a student
// BTech: {E|O}/{YEAR}/{SERIAL}  e.g. E/2026/01
// MCA:   MCA/{E|O}/{YEAR}/{SERIAL}  e.g. MCA/E/2026/01
function buildTokenNumber(course, semesterType, semesterYear, serial) {
  const typeChar = semesterType === 'Even' ? 'E' : 'O';
  const serialStr = String(serial).padStart(2, '0');
  if (course === 'MCA') {
    return `MCA/${typeChar}/${semesterYear}/${serialStr}`;
  }
  return `${typeChar}/${semesterYear}/${serialStr}`;
}

// POST /allotment/run
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
    });
    await event.save();

    // Fetch preferences only for students matching the selected course+year
    // User.course should be 'BTech' or 'MCA'; User.batch encodes the year (e.g. '2nd Year')
    const matchingUsers = await User.find({ course, batch: year, role: 'user' }).select('_id');
    const matchingUserIds = matchingUsers.map(u => u._id);

    const preferences = await Preference.find({ userId: { $in: matchingUserIds } })
      .populate('userId')
      .populate('rankedBookIds')
      .sort({ submittedAt: 1 });

    const allBooks = await Book.find();
    const bookAvailability = {};
    allBooks.forEach(book => {
      bookAvailability[book._id.toString()] = book.availableCopies;
    });

    const validPreferences = preferences.filter(pref => pref.userId != null);

    // Sort by CPI descending, then by submission timestamp ascending (FCFS tiebreaker)
    const scoredPrefs = [...validPreferences].sort((a, b) => {
      const cpiA = a.userId?.cpi ?? 0;
      const cpiB = b.userId?.cpi ?? 0;
      if (cpiB !== cpiA) return cpiB - cpiA;
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

    const allottedPerUser = {};
    scoredPrefs.forEach(pref => {
      allottedPerUser[pref.userId._id.toString()] = new Set();
    });

    const allAllocations = [];

    // Allocation rounds: each round, each student (in CPI desc order) gets next available preferred book
    const ROUNDS = MAX_BOOKS_PER_STUDENT;
    for (let round = 0; round < ROUNDS; round++) {
      for (const pref of scoredPrefs) {
        const userId = pref.userId._id.toString();
        const userAllotted = allottedPerUser[userId];

        if (userAllotted.size >= MAX_BOOKS_PER_STUDENT) continue;

        for (const book of pref.rankedBookIds) {
          if (book == null) continue;
          const bookId = book._id.toString();

          if (!(bookAvailability[bookId] > 0)) continue;
          if (userAllotted.has(bookId)) continue;

          const allocation = new Allotment({
            eventId: event._id,
            userId: pref.userId._id,
            bookId: book._id,
            status: 'allotted',
          });
          await allocation.save();
          allAllocations.push(allocation);

          bookAvailability[bookId]--;
          await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });

          userAllotted.add(bookId);
          break;
        }
      }
    }

    // Assign token numbers
    const semKey = getSemesterKey(semesterType, semesterYear);
    let meta = await AllotmentMeta.findOne({ semesterKey: semKey });
    if (!meta) {
      meta = new AllotmentMeta({ semesterKey: semKey, btechSerial: 0, mcaSerial: 0 });
    }

    // Group users who got at least one book — assign one token per user
    const usersWithBooks = {};
    for (const pref of scoredPrefs) {
      const uid = pref.userId._id.toString();
      if (allottedPerUser[uid].size > 0) {
        usersWithBooks[uid] = pref.userId;
      }
    }

    // Assign tokens in the order they were processed (CPI desc)
    const tokenMap = {}; // userId -> tokenNumber
    for (const pref of scoredPrefs) {
      const uid = pref.userId._id.toString();
      if (!usersWithBooks[uid]) continue;

      let serial;
      if (course === 'MCA') {
        meta.mcaSerial += 1;
        serial = meta.mcaSerial;
      } else {
        meta.btechSerial += 1;
        serial = meta.btechSerial;
      }
      tokenMap[uid] = buildTokenNumber(course, semesterType, semesterYear, serial);
    }
    await meta.save();

    // Update allotment records with token numbers
    for (const [userId, token] of Object.entries(tokenMap)) {
      await Allotment.updateMany(
        { eventId: event._id, userId },
        { $set: { tokenNumber: token } }
      );
    }

    // Send emails with all preferences listed
    for (const pref of scoredPrefs) {
      const user = pref.userId;
      const userId = user._id.toString();
      const userAllotted = allottedPerUser[userId];
      const tokenNumber = tokenMap[userId] || '';

      const preferenceList = pref.rankedBookIds
        .filter(b => b != null)
        .map((b, i) => {
          const allotted = userAllotted.has(b._id.toString());
          const mark = allotted ? '✅ ALLOTTED' : '❌ NOT ALLOTTED';
          return `<li>${i + 1}. <strong>${b.title}</strong> by ${b.author || 'Unknown'} &mdash; ${mark}</li>`;
        })
        .join('');

      let emailBody;
      if (userAllotted.size === 0) {
        emailBody = `
          <p>Dear ${user.name},</p>
          <p>We regret to inform you that no books could be allotted to you in this allotment round.</p>
          <p>Your preferences were:</p>
          <ol>${preferenceList}</ol>
          <p>Please contact the library administration for further assistance.</p>
        `;
      } else {
        emailBody = `
          <p>Dear ${user.name},</p>
          <p>Your book allotment results for ${semesterType} Semester ${semesterYear}:</p>
          <p><strong>Token Number: ${tokenNumber}</strong></p>
          <p>Your Preferences:</p>
          <ol>${preferenceList}</ol>
          <p>Please collect your allotted books from the library with your token number.</p>
        `;
      }

      await addEmailToQueue({
        sendToEmail: user.email,
        title: 'Library Book Allotment Result',
        subject: emailBody,
      });
    }

    const results = await Allotment.find({ eventId: event._id })
      .populate('userId', 'name email registrationNumber course batch branch cpi')
      .populate('bookId', 'title author isbnOrBookId classNo')
      .sort({ createdAt: 1 });

    res.json({
      eventId: event._id,
      runAt: event.runAt,
      course,
      year,
      totalAllocations: allAllocations.length,
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
    const semKey = getSemesterKey(semesterType, semesterYear);
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

    // Group by user
    const byUser = {};
    for (const a of allotments) {
      if (!a.userId || !a.bookId) continue;
      const uid = a.userId._id.toString();
      if (!byUser[uid]) {
        byUser[uid] = {
          user: a.userId,
          tokenNumber: a.tokenNumber,
          books: [],
        };
      }
      byUser[uid].books.push(a.bookId);
    }

    // Sort by branch asc then batch/year asc
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

    // Sort by branch asc, then batch/year asc
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
      .sort({ runAt: -1 });
    res.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /allotment/my-allocation
router.get('/my-allocation', authenticate, async (req, res) => {
  try {
    const latestEvent = await AllotmentEvent.findOne().sort({ runAt: -1 });
    if (!latestEvent) return res.json([]);

    const allocations = await Allotment.find({
      eventId: latestEvent._id,
      userId: req.user.id,
      status: 'allotted',
    }).populate('bookId', 'title author isbnOrBookId category classNo');

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

    // Increment available copies
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
