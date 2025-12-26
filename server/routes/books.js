import express from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Book from '../models/Book.js';

const router = express.Router();

// Get all books
router.get('/', async (req, res) => {
  try {
    console.log('Fetching all books');
    const books = await Book.find().sort({ createdAt: -1 });
    console.log(`Found ${books.length} books`);
    res.json(books);
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
    body('author').trim().notEmpty().withMessage('Author is required'),
    body('isbnOrBookId').trim().notEmpty().withMessage('ISBN/Book ID is required'),
    body('totalCopies').optional().isInt({ min: 1 }).withMessage('Total copies must be at least 1')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { title, author, isbnOrBookId, category, totalCopies = 1, description } = req.body;

      // Check if ISBN/Book ID already exists
      const existingBook = await Book.findOne({ isbnOrBookId });
      if (existingBook) {
        return res.status(400).json({ error: 'Book with this ISBN/Book ID already exists' });
      }

      const book = new Book({
        title,
        author,
        isbnOrBookId,
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

