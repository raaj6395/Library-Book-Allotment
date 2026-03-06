import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { read, utils } from 'xlsx';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import Student from '../models/Student.js';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

const seedStudents = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const filePath = join(__dirname, '../seed_data/student_data.xlsx');
    const wb = read(readFileSync(filePath));
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = utils.sheet_to_json(ws);

    if (!rows.length) {
      console.error('No data found in xlsx file');
      process.exit(1);
    }

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const row of rows) {
      const registrationNumber = String(row['Registration Number'] ?? '').trim();
      const email = String(row['Email'] ?? '').trim().toLowerCase();

      if (!registrationNumber || !email) {
        console.warn('Skipping row with missing Registration Number or Email:', row);
        skipped++;
        continue;
      }

      const studentData = {
        name: String(row['Name'] ?? '').trim(),
        email,
        registrationNumber,
        course: String(row['Course'] ?? '').trim(),
        branch: String(row['Branch'] ?? '').trim(),
        batch: String(row['Year'] ?? '').trim(),
        cpi: parseFloat(row['CPI']) || 0,
      };

      const result = await Student.findOneAndUpdate(
        { registrationNumber },
        {
          $set: studentData,
        },
        { upsert: true, new: true, rawResult: true }
      );

      if (result.lastErrorObject?.upserted) {
        inserted++;
      } else {
        updated++;
      }
    }

    console.log(`Done: ${inserted} users inserted, ${updated} updated, ${skipped} skipped.`);
    console.log('Default password for each user is their Registration Number.');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
};

seedStudents();
