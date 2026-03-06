import express from 'express';
import xlsx from 'xlsx';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Preference from '../models/Preference.js';
import Book from '../models/Book.js';
import Allotment from '../models/Allotment.js';
import AllotmentEvent from '../models/AllotmentEvent.js';
import { addEmailToQueue } from '../emailWorker/emailService.js';

const router = express.Router();

const ROUNDS = 5;
const MAX_BOOKS_PER_STUDENT = 5;

// Numeric priority for course strings (0–10 scale, higher = ranked first)
const COURSE_RANK = {
  'PhD': 10,
  'M.Tech': 8,
  'M.Sc': 7,
  'B.Tech': 5,
  'B.Sc': 4,
  'Diploma': 2,
};

function getCourseScore(course) {
  return COURSE_RANK[course] ?? 5;
}

function getWeights() {
  const w1 = parseFloat(process.env.RANK_W1 ?? '0.40'); // course weight
  const w2 = parseFloat(process.env.RANK_W2 ?? '0.35'); // branch weight
  const w3 = parseFloat(process.env.RANK_W3 ?? '0.25'); // CPI weight
  return { w1, w2, w3 };
}

function compositeScore(user, { w1, w2, w3 }) {
  const courseScore = getCourseScore(user?.course);
  // Branch ordering is not defined; use neutral mid-range so weight is non-zero
  // but does not discriminate between students with different branches.
  const branchScore = 5;
  const cpiScore = user?.cpi ?? 0;
  return courseScore * w1 + branchScore * w2 + cpiScore * w3;
}

// Run allotment event (Admin only)
router.post('/run', authenticate, requireAdmin, async (req, res) => {
  try {
    const weights = getWeights();

    // Create allotment event
    const event = new AllotmentEvent({ runByAdminId: req.user.id });
    await event.save();

    // Fetch all preferences with populated user and book data
    const preferences = await Preference.find()
      .populate('userId')
      .populate('rankedBookIds')
      .sort({ submittedAt: 1 });

    // Build in-memory availability map (bookId string → available copies)
    const allBooks = await Book.find();
    const bookAvailability = {};
    allBooks.forEach(book => {
      bookAvailability[book._id.toString()] = book.availableCopies;
    });

    // Compute composite score for each student and sort:
    //   primary: compositeScore descending (higher score → processed first)
    //   tie-break: submittedAt ascending (earlier submission wins)
    const scoredPrefs = preferences.map(pref => ({
      pref,
      score: compositeScore(pref.userId, weights),
    }));

    scoredPrefs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.pref.submittedAt) - new Date(b.pref.submittedAt);
    });

    // Track books allotted to each user in this run (userId string → Set of bookId strings)
    const allottedPerUser = {};
    scoredPrefs.forEach(({ pref }) => {
      allottedPerUser[pref.userId._id.toString()] = new Set();
    });

    const allAllocations = [];

    // 5 rounds — each student gets at most 1 book per round, 5 books maximum total
    for (let round = 0; round < ROUNDS; round++) {
      for (const { pref } of scoredPrefs) {
        const userId = pref.userId._id.toString();
        const userAllotted = allottedPerUser[userId];

        // Skip if student already holds the maximum number of books
        if (userAllotted.size >= MAX_BOOKS_PER_STUDENT) continue;

        // Iterate over ALL preference slots (up to 10) to find the first eligible book
        for (const book of pref.rankedBookIds) {
          const bookId = book._id.toString();

          // Skip books that are unavailable or already allotted to this student
          if (!(bookAvailability[bookId] > 0)) continue;
          if (userAllotted.has(bookId)) continue;

          // Allot the book
          const allocation = new Allotment({
            eventId: event._id,
            userId: pref.userId._id,
            bookId: book._id,
            status: 'allotted',
          });
          await allocation.save();
          allAllocations.push(allocation);

          // Decrement availability in memory and in DB
          bookAvailability[bookId]--;
          await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });

          userAllotted.add(bookId);
          break; // at most one book per round per student
        }
      }
    }

    // Post-allotment emails — one email per student who submitted preferences
    for (const { pref } of scoredPrefs) {
      const user = pref.userId;
      const userId = user._id.toString();
      const userAllotted = allottedPerUser[userId];

      let emailBody;
      if (userAllotted.size === 0) {
        emailBody = `
          <p>Dear ${user.name},</p>
          <p>We regret to inform you that no books could be allotted to you in this allotment round.</p>
          <p>Please contact the library administration for further assistance.</p>
        `;
      } else {
        const allottedBooks = pref.rankedBookIds.filter(b =>
          userAllotted.has(b._id.toString())
        );
        const bookList = allottedBooks
          .map((b, i) => `<li>${i + 1}. <strong>${b.title}</strong> by ${b.author}</li>`)
          .join('');
        emailBody = `
          <p>Dear ${user.name},</p>
          <p>The following book(s) have been allotted to you:</p>
          <ol>${bookList}</ol>
          <p>Please visit the library to collect your book(s).</p>
        `;
      }

      await addEmailToQueue({
        sendToEmail: user.email,
        title: 'Library Book Allotment Result',
        subject: emailBody,
      });
    }

    // Return JSON summary (API contract unchanged)
    const results = await Allotment.find({ eventId: event._id })
      .populate('userId', 'name email registrationNumber course batch branch')
      .populate('bookId', 'title author isbnOrBookId')
      .sort({ createdAt: 1 });

    res.json({
      eventId: event._id,
      runAt: event.runAt,
      totalAllocations: allAllocations.length,
      totalWaitlists: 0, // waitlisting removed in favour of multi-round allocation
      results,
    });
  } catch (error) {
    console.error('Error running allotment:', error);
    res.status(500).json({ error: 'Server error during allotment' });
  }
});

// Download Excel report for an allotment event (Admin only)
// GET /api/allotment/report/:eventId
router.get('/report/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await AllotmentEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const weights = getWeights();

    // Fetch all preferences sorted by composite score for rank assignment
    const preferences = await Preference.find()
      .populate('userId')
      .populate('rankedBookIds')
      .sort({ submittedAt: 1 });

    // Fetch all allotments for this event (allotted only)
    const allotments = await Allotment.find({
      eventId: req.params.eventId,
      status: 'allotted',
    })
      .populate('userId', '_id')
      .populate('bookId', 'title');

    // Map userId → allotted book titles
    const allottedTitles = {}; // userId string → string[]
    for (const a of allotments) {
      const uid = a.userId._id.toString();
      if (!allottedTitles[uid]) allottedTitles[uid] = [];
      allottedTitles[uid].push(a.bookId.title);
    }

    // Build scored+sorted student rows
    const scoredPrefs = preferences.map(pref => ({
      pref,
      score: compositeScore(pref.userId, weights),
    }));
    scoredPrefs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.pref.submittedAt) - new Date(b.pref.submittedAt);
    });

    // Sheet 1: Students
    const studentHeader = [
      'Rank', 'Student ID', 'Name', 'Course', 'Branch', 'CPI',
      'Composite Score', 'Book 1', 'Book 2', 'Book 3', 'Book 4', 'Book 5',
      'Submission Timestamp',
    ];
    const studentRows = scoredPrefs.map(({ pref, score }, index) => {
      const u = pref.userId;
      const books = allottedTitles[u._id.toString()] ?? [];
      const bookCols = [...books, '', '', '', '', ''].slice(0, 5);
      return [
        index + 1,
        u.registrationNumber ?? '',
        u.name ?? '',
        u.course ?? '',
        u.branch ?? '',
        u.cpi ?? 0,
        score.toFixed(3),
        ...bookCols,
        pref.submittedAt ? new Date(pref.submittedAt).toISOString() : '',
      ];
    });

    // Sheet 2: Books
    const allBooks = await Book.find();
    const bookHeader = [
      'Book ID', 'Title', 'Initial Quantity', 'Remaining Quantity', 'Status',
    ];
    const bookRows = allBooks.map(b => [
      b.isbnOrBookId,
      b.title,
      b.totalCopies,
      b.availableCopies,
      b.availableCopies === 0 ? 'Unavailable' : 'Available',
    ]);

    // Build workbook
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(
      wb,
      xlsx.utils.aoa_to_sheet([studentHeader, ...studentRows]),
      'Students'
    );
    xlsx.utils.book_append_sheet(
      wb,
      xlsx.utils.aoa_to_sheet([bookHeader, ...bookRows]),
      'Books'
    );

    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

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

// Get allotment results (Admin only)
router.get('/results/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const results = await Allotment.find({ eventId: req.params.eventId })
      .populate('userId', 'name email registrationNumber course batch branch')
      .populate('bookId', 'title author isbnOrBookId')
      .sort({ createdAt: 1 });

    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all allotment events (Admin only)
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

// Get user's allocations (for normal users) — returns array (up to 5 books)
router.get('/my-allocation', authenticate, async (req, res) => {
  try {
    const latestEvent = await AllotmentEvent.findOne().sort({ runAt: -1 });
    if (!latestEvent) return res.json([]);

    const allocations = await Allotment.find({
      eventId: latestEvent._id,
      userId: req.user.id,
      status: 'allotted',
    }).populate('bookId', 'title author isbnOrBookId category');

    res.json(allocations);
  } catch (error) {
    console.error('Error fetching user allocation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
