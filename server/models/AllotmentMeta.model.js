import mongoose from 'mongoose';

// Stores persistent token counters per semester
const allotmentMetaSchema = new mongoose.Schema({
  // Unique key per semester: e.g. "Even-2026"
  semesterKey: {
    type: String,
    required: true,
    unique: true,
  },
  // Serial counter for BTech token numbers (continuous across year groups)
  btechSerial: {
    type: Number,
    default: 0,
  },
  // Serial counter for MCA token numbers (separate from BTech)
  mcaSerial: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

allotmentMetaSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('AllotmentMeta', allotmentMetaSchema);
