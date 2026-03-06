import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { read, utils } from 'xlsx';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/Book.model.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

const excelDateToJS = (serial) => {
  if (!serial || typeof serial !== 'number') return new Date();
  return new Date((serial - 25569) * 86400 * 1000);
};

const seedBooks = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const filePath = join(__dirname, '../seed_data/books_details.xlsx');
    const wb = read(readFileSync(filePath));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws);

    if (!rows.length) {
      console.error('No data found in xlsx file');
      process.exit(1);
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const bookData = {
        isbnOrBookId: String(row.isbnOrBookId ?? '').trim(),
        title: String(row.title ?? '').trim(),
        author: String(row.author ?? '').trim(),
        category: String(row.category ?? '').trim(),
        totalCopies: Number(row.totalCopies) || 1,
        availableCopies: Number(row.availableCopies) || 1,
        description: String(row.description ?? '').trim(),
        createdAt: excelDateToJS(row.createdAt),
      };

      if (!bookData.isbnOrBookId || !bookData.title) {
        console.warn('Skipping row with missing isbnOrBookId or title:', row);
        skipped++;
        continue;
      }

      await Book.findOneAndUpdate(
        { isbnOrBookId: bookData.isbnOrBookId },
        bookData,
        { upsert: true, new: true }
      );
      inserted++;
    }

    console.log(`Done: ${inserted} books upserted, ${skipped} rows skipped.`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding books:', error);
    process.exit(1);
  }
};

seedBooks();
