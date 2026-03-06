import mongoose from 'mongoose';

const emailQueueSchema = new mongoose.Schema(
  {
    sendToEmail: { type: String, required: true },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
    },
    attempts: { type: Number, default: 0 },
    error: { type: String },
  },
  { timestamps: true }
);

const EmailQueue = mongoose.model('EmailQueue', emailQueueSchema);

export default EmailQueue;
