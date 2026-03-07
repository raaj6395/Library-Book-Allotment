import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.model.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

await mongoose.connect(MONGODB_URI);
console.log('Connected to MongoDB');

const result = await User.deleteMany({});
console.log(`Deleted ${result.deletedCount} user(s).`);

await mongoose.disconnect();
