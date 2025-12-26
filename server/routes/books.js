import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Book from '../models/Book.js';

const router = express.Router();

// Get all books
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 100, 1);

    const filter = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      filter.$or = [
        { title: regex },
        { author: regex },
        { isbnOrBookId: regex },
        { category: regex }
      ];
    }

    const total = await Book.countDocuments(filter);
    const items = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Support both array format (for backwards compatibility) and object format
    if (req.query.search || req.query.page || req.query.limit) {
      res.json({ items, page, limit, total });
    } else {
      // Backwards compatibility: return array if no query params
      res.json(items);
    }
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single book
router.get('/:id', authenticate, async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json(book);
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add book (Admin only)
router.post('/',
  authenticate,
  requireAdmin,
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('author').optional().trim(),
    body('isbnOrBookId').optional().trim(),
    body('totalCopies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, author, isbnOrBookId, category, totalCopies = 1, description } = req.body;

      // Auto-generate ISBN/Book ID if not provided (format: B + timestamp + random)
      let finalIsbnOrBookId = isbnOrBookId;
      if (!finalIsbnOrBookId || !finalIsbnOrBookId.trim()) {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        finalIsbnOrBookId = `B${timestamp}${random}`;
      } else {
        finalIsbnOrBookId = finalIsbnOrBookId.trim();
      }

      // Check if ISBN/Book ID already exists
      const existingBook = await Book.findOne({ isbnOrBookId: finalIsbnOrBookId });
      if (existingBook) {
        return res.status(400).json({ error: 'Book with this ISBN/Book ID already exists' });
      }

      const book = new Book({
        title: title.trim(),
        author: author ? author.trim() : '',
        isbnOrBookId: finalIsbnOrBookId,
        category: category || '',
        totalCopies,
        availableCopies: totalCopies,
        description: description || ''
      });

      await book.save();
      res.status(201).json(book);
    } catch (error) {
      console.error('Error creating book:', error);
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Book with this ISBN/Book ID already exists' });
      }
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Update book (Admin only)
router.put('/:id',
  authenticate,
  requireAdmin,
  [
    body('title').optional().trim().notEmpty(),
    body('author').optional().trim().notEmpty(),
    body('totalCopies').optional().isInt({ min: 1 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const book = await Book.findById(req.params.id);
      if (!book) {
        return res.status(404).json({ error: 'Book not found' });
      }

      const { title, author, category, totalCopies, description } = req.body;

      if (title) book.title = title;
      if (author) book.author = author;
      if (category !== undefined) book.category = category;
      if (description !== undefined) book.description = description;
      if (totalCopies !== undefined) {
        const diff = totalCopies - book.totalCopies;
        book.totalCopies = totalCopies;
        book.availableCopies = Math.max(0, book.availableCopies + diff);
      }

      await book.save();
      res.json(book);
    } catch (error) {
      console.error('Error updating book:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// Delete book (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const book = await Book.findByIdAndDelete(req.params.id);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

