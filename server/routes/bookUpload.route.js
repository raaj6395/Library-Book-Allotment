import express from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Book from '../models/Book.model.js';

const router = express.Router();

// POST /books/bulk-upload — parse Excel and insert books
// Body is raw xlsx binary
router.post(
  '/bulk-upload',
  authenticate,
  requireAdmin,
  express.raw({ type: ['application/octet-stream', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], limit: '10mb' }),
  async (req, res) => {
    try {
      if (!req.body || !req.body.length) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.body);
      const sheet = workbook.worksheets[0];
      if (!sheet) return res.status(400).json({ error: 'Empty workbook' });

      const headerRow = sheet.getRow(1).values; // 1-indexed
      const colIndex = {};
      for (let i = 1; i < headerRow.length; i++) {
        const header = String(headerRow[i] || '').trim().toLowerCase();
        colIndex[header] = i;
      }

      let added = 0, skipped = 0;
      const skipReasons = [];

      for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
        const row = sheet.getRow(rowNum);
        const getValue = (key) => {
          const idx = colIndex[key];
          if (!idx) return '';
          const cell = row.getCell(idx);
          return cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
        };

        const title = getValue('title');
        const author = getValue('author');
        const classNo = getValue('class no') || getValue('classno') || getValue('class number');
        const isbnOrBookId = getValue('isbn') || getValue('book id') || getValue('isbnorbookid') || getValue('bookid');
        const totalCopiesRaw = getValue('total copies') || getValue('totalcopies') || getValue('copies');
        const availableCopiesRaw = getValue('available copies') || getValue('availablecopies');
        const category = getValue('category') || getValue('subject');
        const description = getValue('description');

        if (!title) {
          skipped++;
          skipReasons.push(`Row ${rowNum}: title is required`);
          continue;
        }

        const totalCopies = parseInt(totalCopiesRaw) || 1;
        const availableCopies = availableCopiesRaw ? Math.min(parseInt(availableCopiesRaw) || totalCopies, totalCopies) : totalCopies;

        let finalId = isbnOrBookId;
        if (!finalId) {
          const ts = Date.now();
          const rand = Math.floor(Math.random() * 1000);
          finalId = `B${ts}${rand}`;
        }

        try {
          const existing = await Book.findOne({ isbnOrBookId: finalId });
          if (existing) {
            skipped++;
            skipReasons.push(`Row ${rowNum} (${title}): ISBN/Book ID "${finalId}" already exists`);
            continue;
          }

          await Book.create({
            title,
            author: author || '',
            isbnOrBookId: finalId,
            classNo: classNo || '',
            category: category || '',
            description: description || '',
            totalCopies,
            availableCopies,
          });
          added++;
        } catch (err) {
          skipped++;
          skipReasons.push(`Row ${rowNum} (${title}): ${err.message}`);
        }
      }

      res.json({
        message: `Upload complete: ${added} books added, ${skipped} skipped`,
        added,
        skipped,
        skipReasons: skipReasons.slice(0, 20),
      });
    } catch (error) {
      console.error('Error uploading books:', error);
      res.status(500).json({ error: 'Server error processing file' });
    }
  }
);

export default router;
