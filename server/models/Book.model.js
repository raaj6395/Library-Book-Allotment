import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  author: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  isbnOrBookId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  category: {
    type: String,
    trim: true
  },
  totalCopies: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  availableCopies: {
    type: Number,
    required: true,
    default: 1,
    min: 0
  },
  description: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Book', bookSchema);

