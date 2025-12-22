import mongoose from 'mongoose';

const preferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rankedBookIds: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'Book',
    required: true,
    validate: {
      validator: function(v) {
        return v.length > 0 && v.length <= 5; // Max 5 preferences
      },
      message: 'Must have between 1 and 5 book preferences'
    }
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure one preference per user
preferenceSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model('Preference', preferenceSchema);

