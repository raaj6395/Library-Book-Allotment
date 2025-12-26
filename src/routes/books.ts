import express from 'express';
import Book from '../models/Book';

const router = express.Router();

// GET /api/books?search=&page=1&limit=20
router.get('/', async (req, res) => {
  try {
    const search = String(req.query.search || '').trim();
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);

    const filter: any = { isDeleted: false };
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ title: re }, { author: re }, { isbn: re }, { category: re }];
    }

    const total = await Book.countDocuments(filter);
    const items = await Book.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('_id title author createdAt');

    res.json({ items, page, limit, total });
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// POST /api/books - create book (basic validation)
router.post('/', async (req, res) => {
  try {
    const { title, author, isbn, category, copies, description } = req.body || {};
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ message: 'title is required' });
    }
    const book = await Book.create({
      title: title.trim(),
      author: author ? String(author).trim() : null,
      isbn: isbn ? String(isbn).trim() : null,
      category: category ? String(category).trim() : null,
      copies: Number(copies) || 1,
      description: description ? String(description) : null,
    });
    res.status(201).json(book);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
