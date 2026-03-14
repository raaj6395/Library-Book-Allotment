import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
  tokenNumber: {
    type: String,
    required: true,
    unique: true,
  },
  // Denormalized student data (survives session-end wipe)
  studentName: {
    type: String,
    required: true,
  },
  regNo: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  course: {
    type: String,
    required: true,
  },
  branch: {
    type: String,
    default: '',
  },
  year: {
    type: Number,
    required: true,
  },
  // Denormalized session label e.g. "ODD 2026"
  session: {
    type: String,
    required: true,
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  // Each entry: { bookId, bookName, quantity: 1 }
  allottedBooks: [
    {
      bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
        required: true,
      },
      bookName: {
        type: String,
        required: true,
      },
      quantity: {
        type: Number,
        default: 1,
      },
    },
  ],
  isPickedUp: {
    type: Boolean,
    default: false,
  },
  isReturned: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

tokenSchema.index({ sessionId: 1 });
tokenSchema.index({ regNo: 1 });
tokenSchema.index({ isPickedUp: 1, isReturned: 1 });

export default mongoose.model('Token', tokenSchema);
