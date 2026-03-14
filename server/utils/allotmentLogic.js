import User from '../models/User.model.js';
import Preference from '../models/Preference.model.js';
import Book from '../models/Book.model.js';
import Allotment from '../models/Allotment.model.js';
import AllotmentMeta from '../models/AllotmentMeta.model.js';
import { addEmailToQueue } from '../emailWorker/emailService.js';
import { libraryEmailTemplate } from './emailTemplates.js';

const MAX_BOOKS_PER_STUDENT = 5;

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

/**
 * Execute the full allotment algorithm for a given event.
 *
 * @param {object} params
 * @param {import('../models/AllotmentEvent.model.js').default} params.event - Already-saved AllotmentEvent document
 * @param {string} params.course - 'BTech' | 'MCA'
 * @param {string} params.year  - '1st Year' | '2nd Year' | ...
 * @param {string} params.semesterType - 'Even' | 'Odd'  (AllotmentEvent enum format)
 * @param {number} params.semesterYear
 * @param {import('mongoose').Types.ObjectId|null} params.sessionId - If provided, filters users/preferences by session
 *
 * @returns {{ totalAllocations: number, results: object[] }}
 */
export async function executeAllotment({ event, course, year, semesterType, semesterYear, sessionId }) {
  // 1. Find matching users
  const userFilter = { course, batch: year, role: 'user' };
  if (sessionId) {
    userFilter.sessionId = sessionId;
  }
  const matchingUsers = await User.find(userFilter).select('_id');
  const matchingUserIds = matchingUsers.map(u => u._id);

  // 2. Fetch preferences (filter by sessionId if provided)
  const prefFilter = { userId: { $in: matchingUserIds } };
  if (sessionId) {
    prefFilter.sessionId = sessionId;
  }
  const preferences = await Preference.find(prefFilter)
    .populate('userId')
    .populate('rankedBookIds')
    .sort({ submittedAt: 1 });

  const allBooks = await Book.find();
  const bookAvailability = {};
  allBooks.forEach(book => {
    bookAvailability[book._id.toString()] = book.availableCopies;
  });

  const validPreferences = preferences.filter(pref => pref.userId != null);

  // 3. Sort by CPI descending, then FCFS tiebreaker
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

  // 4. Allocation rounds
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

  // 5. Assign token numbers
  const semKey = getSemesterKey(semesterType, semesterYear);
  let meta = await AllotmentMeta.findOne({ semesterKey: semKey });
  if (!meta) {
    meta = new AllotmentMeta({ semesterKey: semKey, btechSerial: 0, mcaSerial: 0 });
  }

  const usersWithBooks = {};
  for (const pref of scoredPrefs) {
    const uid = pref.userId._id.toString();
    if (allottedPerUser[uid].size > 0) {
      usersWithBooks[uid] = pref.userId;
    }
  }

  const tokenMap = {};
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

  // 6. Update allotment records with token numbers
  for (const [userId, token] of Object.entries(tokenMap)) {
    await Allotment.updateMany(
      { eventId: event._id, userId },
      { $set: { tokenNumber: token } }
    );
  }

  // 7. Send result emails
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

    const html = libraryEmailTemplate({
      title: 'Library Book Allotment Result',
      body: emailBody,
    });

    await addEmailToQueue({
      sendToEmail: user.email,
      title: 'Library Book Allotment Result - Central Library, MNNIT',
      subject: html,
    });
  }

  // 8. Return results
  const results = await Allotment.find({ eventId: event._id })
    .populate('userId', 'name email registrationNumber course batch branch cpi')
    .populate('bookId', 'title author isbnOrBookId classNo')
    .sort({ createdAt: 1 });

  return {
    totalAllocations: allAllocations.length,
    results,
  };
}
