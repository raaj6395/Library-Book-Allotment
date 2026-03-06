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
  }
});

export default mongoose.model('AllotmentEvent', allotmentEventSchema);

