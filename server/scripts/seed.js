import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Book from '../models/Book.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/library-book-allotment';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Book.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user (password will be hashed by User model pre-save hook)
    const admin = new User({
      name: 'Admin User',
      email: 'admin@library.com',
      registrationNumber: 'ADMIN001',
      password: 'admin123', // Will be hashed automatically
      role: 'admin',
      course: 'Administration',
      batch: '2024',
      specialization: 'System Administration'
    });
    await admin.save();
    console.log('👤 Created admin user: admin@library.com / admin123');

    // Create sample users (passwords will be hashed by User model pre-save hook)
    const user1 = new User({
      name: 'John Doe',
      email: 'john.doe@student.com',
      registrationNumber: 'STU001',
      password: 'user123', // Will be hashed automatically
      role: 'user',
      course: 'Computer Science',
      batch: '2024',
      specialization: 'Software Engineering'
    });
    await user1.save();

    const user2 = new User({
      name: 'Jane Smith',
      email: 'jane.smith@student.com',
      registrationNumber: 'STU002',
      password: 'user123', // Will be hashed automatically
      role: 'user',
      course: 'Information Technology',
      batch: '2024',
      specialization: 'Data Science'
    });
    await user2.save();
    console.log('👥 Created 2 sample users (email: user@student.com / password: user123)');

    // Create sample books
    const books = [
      {
        title: 'Introduction to Algorithms',
        author: 'Thomas H. Cormen',
        isbnOrBookId: 'B001',
        category: 'Computer Science',
        totalCopies: 5,
        availableCopies: 5,
        description: 'Comprehensive guide to algorithms and data structures'
      },
      {
        title: 'Clean Code',
        author: 'Robert C. Martin',
        isbnOrBookId: 'B002',
        category: 'Software Engineering',
        totalCopies: 3,
        availableCopies: 3,
        description: 'A handbook of agile software craftsmanship'
      },
      {
        title: 'Design Patterns',
        author: 'Gang of Four',
        isbnOrBookId: 'B003',
        category: 'Software Engineering',
        totalCopies: 4,
        availableCopies: 4,
        description: 'Elements of reusable object-oriented software'
      },
      {
        title: 'The Pragmatic Programmer',
        author: 'David Thomas',
        isbnOrBookId: 'B004',
        category: 'Software Engineering',
        totalCopies: 3,
        availableCopies: 3,
        description: 'Your journey to mastery'
      },
      {
        title: 'Machine Learning',
        author: 'Tom Mitchell',
        isbnOrBookId: 'B005',
        category: 'Artificial Intelligence',
        totalCopies: 2,
        availableCopies: 2,
        description: 'A comprehensive introduction to machine learning'
      }
    ];

    for (const bookData of books) {
      const book = new Book(bookData);
      await book.save();
    }
    console.log(`📚 Created ${books.length} sample books`);

    console.log('\n✅ Seed data created successfully!');
    console.log('\n📝 Login Credentials:');
    console.log('   Admin: admin@library.com / admin123');
    console.log('   User 1: john.doe@student.com / user123');
    console.log('   User 2: jane.smith@student.com / user123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

