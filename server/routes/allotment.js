import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Preference from '../models/Preference.js';
import Book from '../models/Book.js';
import Allotment from '../models/Allotment.js';
import AllotmentEvent from '../models/AllotmentEvent.js';

const router = express.Router();

// Run allotment event (Admin only)
router.post('/run', authenticate, requireAdmin, async (req, res) => {
  try {
    // Create allotment event
    const event = new AllotmentEvent({
      runByAdminId: req.user.id
    });
    await event.save();

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

    const allocations = [];
    const waitlists = [];

    // Process each user's preferences
    for (const pref of preferences) {
      let allocated = false;

      // Try to allocate based on user's preference order
      for (const bookId of pref.rankedBookIds) {
        const bookIdStr = bookId._id.toString();
        
        if (bookAvailability[bookIdStr] > 0) {
          // Allocate book
          const allocation = new Allotment({
            eventId: event._id,
            userId: pref.userId._id,
            bookId: bookId._id,
            status: 'allotted'
          });
          await allocation.save();
          allocations.push(allocation);

          // Decrease availability
          bookAvailability[bookIdStr]--;
          await Book.findByIdAndUpdate(bookId._id, {
            $inc: { availableCopies: -1 }
          });

          allocated = true;
          break;
        }
      }

      // If no book could be allocated, waitlist the first preference
      if (!allocated && pref.rankedBookIds.length > 0) {
        const waitlist = new Allotment({
          eventId: event._id,
          userId: pref.userId._id,
          bookId: pref.rankedBookIds[0]._id,
          status: 'waitlisted'
        });
        await waitlist.save();
        waitlists.push(waitlist);
      }
    }

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

