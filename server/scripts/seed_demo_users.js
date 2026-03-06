import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    await User.deleteMany({});
    console.log('Cleared existing users');

    await new User({
      name: 'Admin User',
      email: 'admin@library.com',
      registrationNumber: 'ADMIN001',
      password: 'admin123',
      role: 'admin',
      course: 'B.Tech',
      batch: '2024',
      branch: 'Computer Science',
      cpi: 8.5
    }).save();

    await new User({
      name: 'John Doe',
      email: 'john.doe@student.com',
      registrationNumber: 'STU001',
      password: 'user123',
      role: 'user',
      course: 'B.Tech',
      batch: '2024',
      branch: 'Computer Science',
      cpi: 8.5
    }).save();

    await new User({
      name: 'Jane Smith',
      email: 'jane.smith@student.com',
      registrationNumber: 'STU002',
      password: 'user123',
      role: 'user',
      course: 'B.Tech',
      batch: '2024',
      branch: 'Information Technology',
      cpi: 7.9
    }).save();

    console.log('Created 3 users successfully');
    console.log('  Admin: admin@library.com / admin123');
    console.log('  User 1: john.doe@student.com / user123');
    console.log('  User 2: jane.smith@student.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
