import mongoose from 'mongoose';

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  course: {
    type: String,
    trim: true
  },
  branch: {
    type: String,
    trim: true
  },
  batch: {
    type: String,
    trim: true
  },
  cpi: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Student', studentSchema);
