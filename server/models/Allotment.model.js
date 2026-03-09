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
    enum: ['allotted', 'not_allotted', 'waitlist'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

allotmentSchema.index(
  { eventId: 1, userId: 1, bookId: 1 },
  { unique: true }
);

export default mongoose.model('Allotment', allotmentSchema);
