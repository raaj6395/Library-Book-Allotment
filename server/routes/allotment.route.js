import express from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Preference from '../models/Preference.model.js';
import Book from '../models/Book.model.js';
import Allotment from '../models/Allotment.model.js';
import AllotmentEvent from '../models/AllotmentEvent.model.js';
import { addEmailToQueue } from '../emailWorker/emailService.js';
import { libraryEmailTemplate } from "../utils/emailTemplates.js";
import mongoose from 'mongoose';

const router = express.Router();

const ROUNDS = 5;
const MAX_BOOKS_PER_STUDENT = 5;

const COURSE_RANK = {
  'PhD': 10,
  'M.Tech': 9,
  'B.Tech': 8,
  'MCA': 8
};

function getCourseScore(course) {
  return COURSE_RANK[course] ?? 5;
}

function getYearScore(user) {
  if (!user?.batch) return 0;
  return parseInt(user.batch) || 0;
}

function getWeights() {
  const w1 = parseFloat(process.env.RANK_W1 ?? '0.40');
  const w2 = parseFloat(process.env.RANK_W2 ?? '0.20');
  const w3 = parseFloat(process.env.RANK_W3 ?? '0.40');
  return { w1, w2, w3 };
}

function compositeScore(user, { w1, w2, w3 }) {
  const courseScore = getCourseScore(user?.course);
  const yearScore = getYearScore(user);
  const cpiScore = user?.cpi ?? 0;
  return courseScore * w1 + yearScore * w2 + cpiScore * w3;
}

router.post('/run', authenticate, requireAdmin, async (req, res) => {
  try {
    const weights = getWeights();

    const event = new AllotmentEvent({ runByAdminId: req.user.id });
    await event.save();

    const preferences = await Preference.find()
      .populate('userId')
      .populate('rankedBookIds')
      .sort({ submittedAt: 1 });

    const previouslyAllottedUsers = await Allotment.distinct("userId", {
      status: { $in: ["allotted", "not_allotted"] }
    });

    const allBooks = await Book.find();
    const bookAvailability = {};
    allBooks.forEach(book => {
      bookAvailability[book._id.toString()] = book.availableCopies;
    });

    const validPreferences = preferences.filter(pref =>
      pref.userId &&
      !previouslyAllottedUsers.some(
        id => id.toString() === pref.userId._id.toString()
      )
    );

    const scoredPrefs = validPreferences.map(pref => ({
      pref,
      score: compositeScore(pref.userId, weights),
    }));

    scoredPrefs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.pref.submittedAt) - new Date(b.pref.submittedAt);
    });

    const allottedPerUser = {};
    scoredPrefs.forEach(({ pref }) => {
      allottedPerUser[pref.userId._id.toString()] = new Set();
    });

    const allAllocations = [];

    for (let round = 0; round < ROUNDS; round++) {
      for (const { pref } of scoredPrefs) {
        const userId = pref.userId._id.toString();
        const userAllotted = allottedPerUser[userId];

        if (userAllotted.size >= MAX_BOOKS_PER_STUDENT) continue;

        for (const book of pref.rankedBookIds) {
          if (book == null) continue;
          const bookId = book._id.toString();

          if (!(bookAvailability[bookId] > 0)) continue;
          if (userAllotted.has(bookId)) continue;

          allAllocations.push({
            eventId: event._id,
            userId: pref.userId._id,
            bookId: book._id,
            status: 'allotted'
          });
          // await allocation.save();
          // allAllocations.push(allocation);

          bookAvailability[bookId]--;
          // await Book.findByIdAndUpdate(book._id, { $inc: { availableCopies: -1 } });

          userAllotted.add(bookId);
          break;
        }
      }
    }

    //update for not-allotted
    for (const { pref } of scoredPrefs) {

      const userId = pref.userId._id.toString();
      const userAllotted = allottedPerUser[userId];

      for (const book of pref.rankedBookIds) {

        if (!book) continue;

        const bookId = book._id.toString();

        if (!userAllotted.has(bookId)) {

          allAllocations.push({
            eventId: event._id,
            userId: pref.userId._id,
            bookId: book._id,
            status: 'not_allotted'
          });

        }

      }

    }

    if (allAllocations.length > 0) {
      await Allotment.insertMany(allAllocations);
    }

    const bookUpdates = [];

    for (const bookId in bookAvailability) {
      bookUpdates.push({
        updateOne: {
          filter: { _id: bookId },
          update: { $set: { availableCopies: bookAvailability[bookId] } }
        }
      });
    }

    if (bookUpdates.length > 0) {
      await Book.bulkWrite(bookUpdates);
    }

    const userAllottedBooks = {};

    allAllocations.forEach(a => {
      if (!a.bookId) return;
      const uid = a.userId.toString();
      if (!userAllottedBooks[uid]) userAllottedBooks[uid] = [];
      userAllottedBooks[uid].push(a.bookId.toString());
    });

    for (const { pref } of scoredPrefs) {
      const user = pref.userId;
      const userId = user._id.toString();
      const booksReceived = userAllottedBooks[userId] || [];

      let emailBody;
      if (booksReceived.length === 0) {
        emailBody = `
          <p>Dear ${user.name},</p>
          <p>We regret to inform you that no books could be allotted to you in this allotment round.</p>
          <p>Please contact the library administration for further assistance.</p>
        `;
      } else {
        const titles = await Book.find({ _id: { $in: booksReceived } });

        const bookList = titles
          .map(b => `<li><strong>${b.title}</strong> by ${b.author}</li>`)
          .join('');
        emailBody = `
          <p>Dear ${user.name},</p>
          <p>The following book(s) have been allotted to you:</p>
          <ol>${bookList}</ol>
          <p>Please visit the library to collect your book(s).</p>
        `;
      }

      const html = libraryEmailTemplate({
        title: "Library Book Allotment Result",
        body: emailBody,
      });

      await addEmailToQueue({
        sendToEmail: user.email,
        title: "Library Book Allotment Result - Central Library, MNNIT",
        subject: html,
      });
    }

    const results = await Allotment.find({ eventId: event._id })
      .populate('userId', 'name email registrationNumber course batch branch')
      .populate('bookId', 'title author isbnOrBookId')
      .sort({ createdAt: 1 });

    const allottedCount = allAllocations.filter(a => a.status === "allotted").length;
    const notAllottedCount = allAllocations.filter(a => a.status === "not_allotted").length;

    res.json({
      eventId: event._id,
      runAt: event.runAt,
      totalAllocations: allottedCount,
      totalNotAllotted: notAllottedCount,
      results,
    });
  } catch (error) {
    console.error('Error running allotment:', error);
    res.status(500).json({ error: 'Server error during allotment' });
  }
});

router.get('/report/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const event = await AllotmentEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const weights = getWeights();

    const preferences = await Preference.find()
      .populate('userId')
      .populate('rankedBookIds')
      .sort({ submittedAt: 1 });

    const allotments = await Allotment.find({
      eventId: req.params.eventId,
      status: 'allotted',
    })
      .populate('userId', '_id')
      .populate('bookId', 'title');

    const allottedTitles = {};
    for (const a of allotments) {
      if (a.userId == null || a.bookId == null) continue;
      const uid = a.userId._id.toString();
      if (!allottedTitles[uid]) allottedTitles[uid] = [];
      allottedTitles[uid].push(a.bookId.title);
    }

    const scoredPrefs = preferences
      .filter(pref => pref.userId != null)
      .map(pref => ({
        pref,
        score: compositeScore(pref.userId, weights),
      }));
    scoredPrefs.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.pref.submittedAt) - new Date(b.pref.submittedAt);
    });

    const studentHeader = [
      'Rank', 'Student ID', 'Name', 'Course',
      'Book 1', 'Book 2', 'Book 3', 'Book 4', 'Book 5',
      'Submission Timestamp',
    ];
    const studentRows = scoredPrefs.map(({ pref }, index) => {
      const u = pref.userId;
      const books = allottedTitles[u._id.toString()] ?? [];
      const bookCols = [...books, '', '', '', '', ''].slice(0, 5);
      return [
        index + 1,
        u.registrationNumber ?? '',
        u.name ?? '',
        u.course ?? '',
        ...bookCols,
        pref.submittedAt ? new Date(pref.submittedAt).toISOString() : '',
      ];
    });

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

    const workbook = new ExcelJS.Workbook();

    const sheet1 = workbook.addWorksheet('Students');
    sheet1.addRow(studentHeader);
    for (const row of studentRows) sheet1.addRow(row);

    const sheet2 = workbook.addWorksheet('Books');
    sheet2.addRow(bookHeader);
    for (const row of bookRows) sheet2.addRow(row);

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


router.get('/my-allocation', authenticate, async (req, res) => {
  try {

    const allocations = await Allotment.find({
      userId: req.user.id,
      status: { $in: ["allotted", "not_allotted"] }
    })
      .populate("bookId", "title author isbnOrBookId category")
      .sort({ createdAt: -1 });

    res.json(allocations);

  } catch (error) {
    console.error("Error fetching user allocation:", error);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
