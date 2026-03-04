import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Preference from '../models/Preference.js';
import Book from '../models/Book.js';
import Allotment from '../models/Allotment.js';
import AllotmentEvent from '../models/AllotmentEvent.js';
import mongoose from 'mongoose';

const router = express.Router();

// Run allotment event (Admin only)
router.post('/run', authenticate, requireAdmin, async (req, res) => {
  //start transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create allotment event
    const event = new AllotmentEvent({
      runByAdminId: req.user.id
    });
    await event.save({session});

    // Get all preferences sorted by submission time (first-come-first-serve)
    const preferences = await Preference.find()
      .populate('userId')
      .populate('rankedBookIds')
      .sort({ submittedAt: 1 });

    // Get all books with available copies
    const books = await Book.find();
    const bookAvailability = {};
    books.forEach(book => {
      bookAvailability[book._id.toString()] = book.availableCopies;
    });

    //get existing allocations
    const existingAllocations = await Allotment.find({ status: 'allotted' });

    const userBookMap = new Set();

    existingAllocations.forEach(a => {
      userBookMap.add(`${a.userId}_${a.bookId}`);
    })

    const allocations = [];
    const waitlists = [];

    // Process each user's preferences
    for (const pref of preferences) {
      // Try to allocate based on user's preference order
      for (const book of pref.rankedBookIds) {
        const bookId = book._id.toString();
        const key = `${pref.userId._id}_${bookId}`;

        //skip if already allocated earlier
        if (userBookMap.has(key)) continue;

        //if book available, then allocate
        if (bookAvailability[bookId] > 0) {
          //check if waitlisted already
          const existingWaitlist = await Allotment.findOne({
            userId: pref.userId._id,
            bookId: bookId,
            status: "waitlisted"
          }).session(session);

          if (existingWaitlist) {
            // Upgrade waitlist to allotted
            existingWaitlist.status = "allotted";
            existingWaitlist.eventId = event._id;
            existingWaitlist.createdAt = new Date();

            await existingWaitlist.save({session});

            allocations.push(existingWaitlist);
          }
          else {
            // fresh Allocate book
            const allocation = new Allotment({
              eventId: event._id,
              userId: pref.userId._id,
              bookId: bookId,
              status: 'allotted'
            });
            await allocation.save({session});
            allocations.push(allocation);
          }

          // Decrease availability
          bookAvailability[bookId]--;
          userBookMap.add(key);

          await Book.findByIdAndUpdate(bookId, {
            $inc: { availableCopies: -1 }
          }, {session});
        }
        else {
          // If no book could be allocated, waitlist the first preference

          //first check if the user+book is already in waitlist or not
          const existingWaitlist = await Allotment.findOne({
            userId: pref.userId._id,
            bookId: bookId,
            status: "waitlisted"
          });

          if (!existingWaitlist) {
            const waitlist = new Allotment({
              eventId: event._id,
              userId: pref.userId._id,
              bookId: bookId,
              status: "waitlisted"
            });

            await waitlist.save({session});
            waitlists.push(waitlist);
          }
        }
      }
    }

    //end transaction
    await session.commitTransaction();
    session.endSession();

    // Get detailed results
    const results = await Allotment.find({ eventId: event._id })
      .populate('userId', 'name email registrationNumber course batch specialization')
      .populate('bookId', 'title author isbnOrBookId')
      .sort({ createdAt: 1 });

    res.json({
      eventId: event._id,
      runAt: event.runAt,
      totalAllocations: allocations.length,
      totalWaitlists: waitlists.length,
      results
    });
  } catch (error) {
    //abort transaction
    await session.abortTransaction();
    session.endSession();

    console.error('Error running allotment:', error);
    res.status(500).json({ error: 'Server error during allotment' });
  }
});

// Get allotment results (Admin only)
router.get('/results/:eventId', authenticate, requireAdmin, async (req, res) => {
  try {
    const results = await Allotment.find({ eventId: req.params.eventId })
      .populate('userId', 'name email registrationNumber course batch specialization')
      .populate('bookId', 'title author isbnOrBookId')
      .sort({ createdAt: 1 });

    res.json(results);
  } catch (error) {
    console.error('Error fetching results:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all allotment events (Admin only)
router.get('/events', authenticate, requireAdmin, async (req, res) => {
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

// Get user's allocation (for normal users)
router.get('/my-allocation', authenticate, async (req, res) => {
  try {
    // Get the latest event
    const latestEvent = await AllotmentEvent.findOne().sort({ runAt: -1 });

    if (!latestEvent) {
      return res.json(null);
    }

    const allocation = await Allotment.findOne({
      eventId: latestEvent._id,
      userId: req.user.id
    })
      .populate('bookId', 'title author isbnOrBookId category');

    res.json(allocation);
  } catch (error) {
    console.error('Error fetching user allocation:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

