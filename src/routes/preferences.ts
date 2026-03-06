import express from 'express';
import { MAX_BOOK_PREFERENCES } from '../config/constants';
import User from '../models/User';
import Book from '../models/Book';

const router = express.Router();

router.post('/', async (req, res) => {
  const userId = (req as any).user?.id;
  const { bookIds } = req.body as { bookIds: string[] };

  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  if (!Array.isArray(bookIds)) return res.status(400).json({ message: 'bookIds must be an array' });

  if (bookIds.length > MAX_BOOK_PREFERENCES) {
    return res.status(400).json({ message: `You can select up to ${MAX_BOOK_PREFERENCES} books` });
  }

  const uniqueIds = Array.from(new Set(bookIds));
  if (uniqueIds.length !== bookIds.length) {
    return res.status(400).json({ message: 'Duplicate book selections are not allowed' });
  }

  const books = await Book.find({ _id: { $in: bookIds }, isDeleted: false }).select('_id');
  if (books.length !== bookIds.length) {
    return res.status(400).json({ message: 'Some selected books are not available' });
  }

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.preferencesSubmittedAt) {
    return res.status(409).json({ message: 'Preferences have already been submitted' });
  }

  user.set('preferences', bookIds);
  user.set('preferencesSubmittedAt', new Date());
  await user.save();

  res.status(201).json({ message: 'Preferences submitted', submittedAt: user.preferencesSubmittedAt, bookIds });
});

export default router;
