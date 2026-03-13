import express from 'express';
import ExcelJS from 'exceljs';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import Student from '../models/Student.model.js';

const router = express.Router();

// Helper: parse multipart/form-data manually using express raw body
// We use express.raw() on this specific route, then ExcelJS reads from buffer
import { Readable } from 'stream';

function bufferToStream(buf) {
  const r = new Readable();
  r.push(buf);
  r.push(null);
  return r;
}

// POST /students/upload — upload student Excel
// Expects multipart form-data with field "file" (xlsx) + body fields course, year
// We use a simple approach: accept raw binary body with content-type detection
// Since the server uses express.json(), for file uploads we need multer or similar.
// But to keep things simple with no new deps, let's use ExcelJS with a URL-based approach.
// Actually we'll use the multer-free approach with express.raw() on this route.

// GET /students — list students (optional filter by course, year)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { course, year } = req.query;
    const filter = {};
    if (course) filter.course = course;
    if (year) filter.batch = year;
    const students = await Student.find(filter).sort({ name: 1 });
    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /students/clear — clear students (with optional course+year filter)
router.delete('/clear', authenticate, requireAdmin, async (req, res) => {
  try {
    const { course, year } = req.query;
    const filter = {};
    if (course) filter.course = course;
    if (year) filter.batch = year;
    const result = await Student.deleteMany(filter);
    res.json({ message: `Cleared ${result.deletedCount} student records` });
  } catch (error) {
    console.error('Error clearing students:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /students/upload — parse Excel and upsert students
// Body is raw xlsx binary (Content-Type: application/octet-stream)
// Query params: course, year
router.post(
  '/upload',
  authenticate,
  requireAdmin,
  express.raw({ type: ['application/octet-stream', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], limit: '10mb' }),
  async (req, res) => {
    try {
      const { course, year } = req.query;
      if (!course || !year) {
        return res.status(400).json({ error: 'course and year query parameters are required' });
      }
      if (!req.body || !req.body.length) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(req.body);
      const sheet = workbook.worksheets[0];
      if (!sheet) return res.status(400).json({ error: 'Empty workbook' });

      // Read header row to determine column indices
      const headerRow = sheet.getRow(1).values; // 1-indexed, index 0 is empty
      const colIndex = {};
      for (let i = 1; i < headerRow.length; i++) {
        const header = String(headerRow[i] || '').trim().toLowerCase();
        colIndex[header] = i;
      }

      const required = ['reg no', 'name', 'email'];
      for (const r of required) {
        if (!colIndex[r]) {
          return res.status(400).json({ error: `Missing required column: "${r}". Required columns: Reg No, Name, Email, CPI, Branch` });
        }
      }

      let added = 0, updated = 0, skipped = 0;
      const skipReasons = [];

      for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
        const row = sheet.getRow(rowNum);
        const getValue = (key) => {
          const idx = colIndex[key];
          if (!idx) return '';
          const cell = row.getCell(idx);
          return cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
        };

        const regNo = getValue('reg no') || getValue('regno') || getValue('registration number') || getValue('registrationno');
        const name = getValue('name');
        const email = getValue('email');
        const cpiRaw = getValue('cpi');
        const branch = getValue('branch');

        if (!regNo || !name || !email) {
          skipped++;
          skipReasons.push(`Row ${rowNum}: missing reg no, name, or email`);
          continue;
        }

        const cpi = parseFloat(cpiRaw) || 0;

        try {
          const existing = await Student.findOne({ registrationNumber: regNo });
          if (existing) {
            existing.name = name;
            existing.email = email;
            existing.cpi = cpi;
            existing.branch = branch || existing.branch;
            existing.course = course;
            existing.batch = year;
            await existing.save();
            updated++;
          } else {
            await Student.create({
              name,
              email: email.toLowerCase(),
              registrationNumber: regNo,
              course,
              batch: year,
              branch,
              cpi,
            });
            added++;
          }
        } catch (err) {
          skipped++;
          skipReasons.push(`Row ${rowNum} (${regNo}): ${err.message}`);
        }
      }

      res.json({
        message: `Upload complete: ${added} added, ${updated} updated, ${skipped} skipped`,
        added,
        updated,
        skipped,
        skipReasons: skipReasons.slice(0, 20), // limit to first 20 reasons
      });
    } catch (error) {
      console.error('Error uploading student data:', error);
      res.status(500).json({ error: 'Server error processing file' });
    }
  }
);

export default router;
