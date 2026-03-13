import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';
import Student from '../models/Student.model.js';
import Book from '../models/Book.model.js';
import Allotment from '../models/Allotment.model.js';
import AllotmentEvent from '../models/AllotmentEvent.model.js';
import AllotmentMeta from '../models/AllotmentMeta.model.js';
import Preference from '../models/Preference.model.js';
import EmailQueue from '../models/emailQueue.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

const collections = [
  { model: User, name: 'User' },
  { model: Student, name: 'Student' },
  { model: Book, name: 'Book' },
  { model: Allotment, name: 'Allotment' },
  { model: AllotmentEvent, name: 'AllotmentEvent' },
  { model: AllotmentMeta, name: 'AllotmentMeta' },
  { model: Preference, name: 'Preference' },
  { model: EmailQueue, name: 'EmailQueue' },
];

for (const { model, name } of collections) {
  const result = await model.deleteMany({});
  console.log(`Deleted ${result.deletedCount} ${name} document(s).`);
}

await mongoose.disconnect();
console.log('Database cleared.');
