import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Book from '../models/Book.model.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

const excelDateToJS = (serialOrValue) => {
  if (!serialOrValue) return new Date();
  if (serialOrValue instanceof Date) return serialOrValue;
  const serial = Number(serialOrValue);
  if (Number.isNaN(serial)) return new Date();
  return new Date((serial - 25569) * 86400 * 1000);
};

const seedBooks = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const filePath = join(__dirname, '../seed_data/books_details.xlsx');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);
    const worksheet = workbook.worksheets[0];

    const rows = [];
    let headers = [];
    worksheet.eachRow((row, rowNumber) => {
      const values = row.values || [];
      if (rowNumber === 1) {
        headers = values.slice(1).map((h) => (h == null ? '' : String(h).trim()));
        return;
      }
      if (headers.length === 0) return;
      const obj = {};
      for (let i = 0; i < headers.length; i++) {
        const key = headers[i];
        const cell = values[i + 1];
        obj[key] = cell;
      }
      rows.push(obj);
    });

    if (!rows.length) {
      console.error('No data found in xlsx file');
      process.exit(1);
    }

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const bookData = {
        isbnOrBookId: String(row.isbnOrBookId ?? row['isbnOrBookId'] ?? '').trim(),
        title: String(row.title ?? row['title'] ?? '').trim(),
        author: String(row.author ?? row['author'] ?? '').trim(),
        category: String(row.category ?? row['category'] ?? '').trim(),
        totalCopies: Number(row.totalCopies ?? row['totalCopies']) || 1,
        availableCopies: Number(row.availableCopies ?? row['availableCopies']) || 1,
        description: String(row.description ?? row['description'] ?? '').trim(),
        createdAt: excelDateToJS(row.createdAt ?? row['createdAt']),
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
