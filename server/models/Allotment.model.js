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
  tokenNumber: {
    type: String,
    default: ''
  },
  returned: {
    type: Boolean,
    default: false
  },
  returnedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

allotmentSchema.index({ eventId: 1, userId: 1 });
allotmentSchema.index({ eventId: 1, bookId: 1 });
allotmentSchema.index({ userId: 1, returned: 1 });

export default mongoose.model('Allotment', allotmentSchema);
