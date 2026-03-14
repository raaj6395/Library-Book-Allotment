import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  semesterType: {
    type: String,
    enum: ['ODD', 'EVEN'],
    required: true,
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'INACTIVE'],
    default: 'ACTIVE',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  endedAt: {
    type: Date,
    default: null,
  },
});

sessionSchema.index({ status: 1, _id: 1 });
sessionSchema.index({ semesterType: 1, year: 1 }, { unique: true });

// Enforce single-ACTIVE constraint on new documents
sessionSchema.pre('save', async function (next) {
  if (this.isNew && this.status === 'ACTIVE') {
    const count = await mongoose.model('Session').countDocuments({ status: 'ACTIVE' });
    if (count > 0) {
      return next(new Error('An active session already exists'));
    }
  }
  next();
});

export default mongoose.model('Session', sessionSchema);
