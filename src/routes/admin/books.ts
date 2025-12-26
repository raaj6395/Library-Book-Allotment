import express from 'express';
import Book from '../../models/Book';
// import requireAdmin from '../../middleware/requireAdmin'; // adapt to your middleware

const router = express.Router();

// GET /api/admin/books?search=&page=1&limit=20
router.get('/', /* requireAdmin, */ async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.max(Number(req.query.limit) || 20, 1);
    const filter: any = { isDeleted: false };

    if (search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: re }, { author: re }];
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

// POST /api/admin/books
router.post('/', /* requireAdmin, */ async (req, res) => {
  try {
    const { title, author } = req.body;
    if (!title || typeof title !== 'string') return res.status(400).json({ message: 'title is required' });
    const book = await Book.create({ title: title.trim(), author: author ? String(author).trim() : null });
    res.status(201).json(book);
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' });
  }
});

// DELETE /api/admin/books/:bookId (soft delete, idempotent success)
router.delete('/:bookId', /* requireAdmin, */ async (req, res) => {
  try {
    const { bookId } = req.params;
    const book = await Book.findById(bookId);
    if (!book || book.isDeleted) {
      // idempotent success
      return res.json({ success: true });
    }
    book.isDeleted = true;
    book.deletedAt = new Date();
    await book.save();
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
});

export default router;
