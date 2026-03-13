/**
 * seed_data.js — single script to seed the entire DB
 *
 * Seeds:
 *  1. Admin user
 *  2. Books  (from sample_data/sample_books.xlsx)
 *  3. Students (from all sample_data/sample_students_*.xlsx files)
 *
 * Usage:
 *   cd server && node scripts/seed_data.js
 *
 * Options (env vars):
 *   CLEAR=1   — wipe existing books + students before seeding (default: upsert)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';

import User    from '../models/User.model.js';
import Book    from '../models/Book.model.js';
import Student from '../models/Student.model.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAMPLE_DIR = path.join(__dirname, '../sample_data');
const CLEAR = process.env.CLEAR === '1';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

// ─── helpers ──────────────────────────────────────────────────────────────────

function header(msg) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${msg}`);
  console.log('─'.repeat(50));
}

function colMap(row) {
  const map = {};
  row.values.forEach((val, i) => {
    if (val) map[String(val).trim().toLowerCase()] = i;
  });
  return map;
}

function cellVal(row, idx) {
  if (!idx) return '';
  const v = row.getCell(idx).value;
  return v !== null && v !== undefined ? String(v).trim() : '';
}

// ─── 1. Admin ─────────────────────────────────────────────────────────────────

async function seedAdmin() {
  header('Seeding Admin');

  const existing = await User.findOne({ role: 'admin' });
  if (existing) {
    console.log(`  ⚠  Admin already exists (${existing.email}) — skipping`);
    return;
  }

  await new User({
    name:               'Admin User',
    email:              'admin@library.com',
    registrationNumber: 'ADMIN001',
    password:           'admin123',
    role:               'admin',
    course:             'B.Tech',
    batch:              '2024',
    branch:             'Computer Science',
    cpi:                10,
  }).save();

  console.log('  ✅ Admin created  →  admin@library.com  /  admin123');
}

// ─── 2. Books ─────────────────────────────────────────────────────────────────

async function seedBooks() {
  header('Seeding Books  (sample_books.xlsx)');

  const filePath = path.join(SAMPLE_DIR, 'sample_books.xlsx');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.worksheets[0];

  if (CLEAR) {
    const { deletedCount } = await Book.deleteMany({});
    console.log(`  🗑  Cleared ${deletedCount} existing books`);
  }

  const col = colMap(ws.getRow(1));

  // flexible column aliases
  const get = (row, ...keys) => {
    for (const k of keys) {
      const v = cellVal(row, col[k]);
      if (v) return v;
    }
    return '';
  };

  let added = 0, skipped = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row  = ws.getRow(r);
    const title = get(row, 'title');
    if (!title) continue;

    const author    = get(row, 'author');
    const classNo   = get(row, 'class no', 'classno', 'class number');
    const isbn      = get(row, 'isbn', 'book id', 'bookid', 'isbnorbookid');
    const totalRaw  = get(row, 'total copies', 'totalcopies', 'copies');
    const availRaw  = get(row, 'available copies', 'availablecopies');
    const category  = get(row, 'category', 'subject');
    const desc      = get(row, 'description');

    const totalCopies = parseInt(totalRaw) || 1;
    const availableCopies = availRaw ? Math.min(parseInt(availRaw) || totalCopies, totalCopies) : totalCopies;

    let finalId = isbn;
    if (!finalId) {
      finalId = `B${Date.now()}${Math.floor(Math.random() * 1000)}`;
    }

    try {
      await Book.findOneAndUpdate(
        { isbnOrBookId: finalId },
        { $setOnInsert: { title, author, isbnOrBookId: finalId, classNo, category, description: desc, totalCopies, availableCopies } },
        { upsert: true, new: false }
      );
      added++;
      console.log(`  ✅ [${String(added).padStart(2, '0')}] ${title}`);
    } catch (err) {
      skipped++;
      console.log(`  ⚠  Row ${r} skipped — ${err.message}`);
    }
  }

  console.log(`\n  Done: ${added} books upserted, ${skipped} skipped`);
}

// ─── 3. Students ─────────────────────────────────────────────────────────────

// Extract course + year from filename like:
//   sample_students_btech_1st_year.xlsx  → { course: 'BTech', year: '1st Year' }
//   sample_students_mca_2nd_year.xlsx    → { course: 'MCA',   year: '2nd Year' }
function parseCourseYear(filename) {
  const base = path.basename(filename, '.xlsx').replace('sample_students_', '');
  // base = btech_1st_year | mca_2nd_year
  const mcaMatch   = base.match(/^mca_(\d+(?:st|nd|rd|th)_year)$/i);
  const btechMatch = base.match(/^btech_(\d+(?:st|nd|rd|th)_year)$/i);

  if (mcaMatch) {
    return { course: 'MCA',   year: mcaMatch[1].replace('_', ' ').replace(/^\w/, c => c.toUpperCase()).replace(/ (\w)/, (_, c) => ' ' + c.toUpperCase()) };
  }
  if (btechMatch) {
    return { course: 'BTech', year: btechMatch[1].replace('_', ' ').replace(/^\w/, c => c.toUpperCase()).replace(/ (\w)/, (_, c) => ' ' + c.toUpperCase()) };
  }
  return null;
}

async function seedStudents() {
  header('Seeding Students  (sample_students_*.xlsx)');

  if (CLEAR) {
    const { deletedCount } = await Student.deleteMany({});
    console.log(`  🗑  Cleared ${deletedCount} existing students`);
  }

  const files = readdirSync(SAMPLE_DIR)
    .filter(f => f.startsWith('sample_students_') && f.endsWith('.xlsx'))
    .sort();

  if (files.length === 0) {
    console.log('  ⚠  No student Excel files found in sample_data/');
    return;
  }

  let totalAdded = 0, totalSkipped = 0;

  for (const file of files) {
    const meta = parseCourseYear(file);
    if (!meta) {
      console.log(`  ⚠  Cannot parse course/year from "${file}" — skipping file`);
      continue;
    }

    const { course, year } = meta;
    const filePath = path.join(SAMPLE_DIR, file);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(filePath);
    const ws = wb.worksheets[0];
    const col = colMap(ws.getRow(1));

    const get = (row, ...keys) => {
      for (const k of keys) {
        const v = cellVal(row, col[k]);
        if (v) return v;
      }
      return '';
    };

    let fileAdded = 0, fileSkipped = 0;

    for (let r = 2; r <= ws.rowCount; r++) {
      const row   = ws.getRow(r);
      const regNo = get(row, 'reg no', 'regno', 'registration number', 'registrationno');
      const name  = get(row, 'name');
      const email = get(row, 'email');

      if (!regNo || !name || !email) { fileSkipped++; continue; }

      const cpi    = parseFloat(get(row, 'cpi')) || 0;
      const branch = get(row, 'branch');

      try {
        await Student.findOneAndUpdate(
          { registrationNumber: regNo },
          { $set: { name, email: email.toLowerCase(), registrationNumber: regNo, course, batch: year, branch, cpi } },
          { upsert: true }
        );
        fileAdded++;
      } catch (err) {
        fileSkipped++;
        console.log(`    ⚠  Row ${r} (${regNo}): ${err.message}`);
      }
    }

    console.log(`  📄 ${file}  →  course=${course}, year=${year}  |  ${fileAdded} upserted, ${fileSkipped} skipped`);
    totalAdded   += fileAdded;
    totalSkipped += fileSkipped;
  }

  console.log(`\n  Done: ${totalAdded} students upserted, ${totalSkipped} skipped`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║        Library Book Allotment — Seed Script      ║');
  console.log('╚══════════════════════════════════════════════════╝');
  if (CLEAR) console.log('\n  ⚠  CLEAR=1 — existing books + students will be wiped');

  await mongoose.connect(MONGODB_URI);
  console.log('\n  🔗 Connected to MongoDB');

  await seedAdmin();
  await seedBooks();
  await seedStudents();

  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║               Seeding complete ✅                ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('\n[FATAL]', err.message);
  process.exit(1);
});
