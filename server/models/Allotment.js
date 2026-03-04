import mongoose from 'mongoose';

const allotmentSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AllotmentEvent',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Book',
    required: true
  },
  status: {
    type: String,
    enum: ['allotted', 'waitlisted'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
allotmentSchema.index({ eventId: 1, userId: 1 });
allotmentSchema.index({ eventId: 1, bookId: 1 });

// Prevent duplicate allocation for same user-book
allotmentSchema.index({ userId: 1, bookId: 1 }, { unique: true });

// Faster waitlist checks
allotmentSchema.index({ userId: 1, bookId: 1, status: 1 });

export default mongoose.model('Allotment', allotmentSchema);

