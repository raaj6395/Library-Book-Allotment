import mongoose from 'mongoose';

const allotmentArchiveSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
  },
  // Denormalized session label e.g. "ODD 2026"
  session: {
    type: String,
    required: true,
  },
  // Denormalized student data
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
    default: '',
  },
  branch: {
    type: String,
    default: '',
  },
  year: {
    type: Number,
    required: true,
  },
  allottedBooks: [
    {
      bookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
      },
      bookName: {
        type: String,
        required: true,
      },
    },
  ],
  tokenNumber: {
    type: String,
    required: true,
  },
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

allotmentArchiveSchema.index({ sessionId: 1 });

export default mongoose.model('AllotmentArchive', allotmentArchiveSchema);
