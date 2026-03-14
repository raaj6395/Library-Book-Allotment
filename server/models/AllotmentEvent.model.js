import mongoose from 'mongoose';

const allotmentEventSchema = new mongoose.Schema({
  runAt: {
    type: Date,
    default: Date.now
  },
  runByAdminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: String,  // 'BTech' | 'MCA'
    required: true
  },
  year: {
    type: String,  // '1st Year' | '2nd Year' | '3rd Year' | '4th Year'
    required: true
  },
  semesterType: {
    type: String,
    enum: ['Even', 'Odd'],
    default: 'Even'
  },
  semesterYear: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: null,
  }
});

export default mongoose.model('AllotmentEvent', allotmentEventSchema);

