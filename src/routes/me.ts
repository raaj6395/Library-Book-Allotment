import express from 'express';
import { MAX_BOOK_PREFERENCES } from '../config/constants';
import User from '../models/User';
import Book from '../models/Book';
// ...auth middleware...

const router = express.Router();

router.get('/library-status', async (req, res) => {
  const userId = (req as any).user?.id;
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found' });

  const preferences = {
    hasSubmitted: !!user.preferencesSubmittedAt,
    submittedAt: user.preferencesSubmittedAt || null,
    bookIds: (user as any).preferences || [],
    books: [] as any[],
  };

  if (preferences.bookIds.length) {
    preferences.books = await Book.find({ _id: { $in: preferences.bookIds } }).select('_id title author');
  }

  // Simple placeholder for allotment - adapt to your allotment model
  const allotment = {
    isAllotted: false,
    allottedAt: null,
    books: [],
  };

  res.json({
    maxBookPreferences: MAX_BOOK_PREFERENCES,
    preferences,
    allotment,
  });
});

export default router;
