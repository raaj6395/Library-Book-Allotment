import express from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Token from '../models/Token.model.js';
import Book from '../models/Book.model.js';

const router = express.Router();

// GET /api/tokens/unreturned — Get all tokens where isPickedUp=true AND isReturned=false
// Must be defined BEFORE /:tokenNumber to avoid route conflict
router.get('/unreturned', authenticate, requireAdmin, async (req, res) => {
  try {
    const filter = { isPickedUp: true, isReturned: false };
    if (req.query.sessionId) {
      filter.sessionId = req.query.sessionId;
    }

    const tokens = await Token.find(filter).sort({ createdAt: -1 });
    res.json(tokens);
  } catch (error) {
    console.error('Error fetching unreturned tokens:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tokens/unreturned/download — Download unreturned books as Excel
router.get('/unreturned/download', authenticate, requireAdmin, async (req, res) => {
  try {
    const filter = { isPickedUp: true, isReturned: false };
    if (req.query.sessionId) {
      filter.sessionId = req.query.sessionId;
    }

    const tokens = await Token.find(filter).sort({ createdAt: -1 });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Unreturned Books');
    sheet.addRow([
      'Student Name', 'Reg No', 'Email', 'Course', 'Branch', 'Year',
      'Session', 'Token Number', 'Allotted Books',
    ]);

    for (const t of tokens) {
      const bookNames = t.allottedBooks.map(b => b.bookName).join(', ');
      sheet.addRow([
        t.studentName,
        t.regNo,
        t.email,
        t.course,
        t.branch,
        t.year,
        t.session,
        t.tokenNumber,
        bookNames,
      ]);
    }

    const buffer = await workbook.xlsx.writeBuffer();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="unreturned-books.xlsx"',
    });
    res.send(buffer);
  } catch (error) {
    console.error('Error generating unreturned report:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/tokens/:tokenNumber — Look up a token by its number
router.get('/:tokenNumber', authenticate, async (req, res) => {
  try {
    const token = await Token.findOne({ tokenNumber: req.params.tokenNumber });
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json(token);
  } catch (error) {
    console.error('Error looking up token:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tokens/:tokenNumber/pickup — Mark token as picked up
router.put('/:tokenNumber/pickup', authenticate, requireAdmin, async (req, res) => {
  try {
    const token = await Token.findOne({ tokenNumber: req.params.tokenNumber });
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    if (token.isPickedUp) {
      return res.status(400).json({ error: 'Books already marked as picked up' });
    }

    token.isPickedUp = true;
    await token.save();

    res.json({ message: 'Books marked as picked up', token });
  } catch (error) {
    console.error('Error marking pickup:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/tokens/:tokenNumber/return — Process book return (restock + set isReturned)
router.put('/:tokenNumber/return', authenticate, requireAdmin, async (req, res) => {
  try {
    const token = await Token.findOne({ tokenNumber: req.params.tokenNumber });
    if (!token) {
      return res.status(404).json({ error: 'Token not found' });
    }
    if (token.isReturned) {
      return res.status(400).json({ error: 'Books already returned' });
    }

    // Restock each book
    for (const entry of token.allottedBooks) {
      await Book.findByIdAndUpdate(entry.bookId, {
        $inc: { availableCopies: entry.quantity },
      });
    }

    token.isReturned = true;
    await token.save();

    res.json({ message: 'Books returned and restocked successfully', token });
  } catch (error) {
    console.error('Error processing return:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
