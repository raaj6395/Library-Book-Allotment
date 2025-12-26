import mongoose, { Schema, Document } from 'mongoose';

interface IUser extends Document {
  name: string;
  email: string;
  registrationNumber: string;
  course?: string;
  batch?: string;
  specialization?: string;
  cpi?: number | null;
  preferencesSubmittedAt?: Date | null;
}

const UserSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true,
  },
  course: {
    type: String,
    default: '',
  },
  batch: {
    type: String,
    default: '',
  },
  specialization: {
    type: String,
    default: '',
  },
  cpi: {
    type: Number,
    min: 0,
    max: 10,
    required: false,
    default: null,
  },
  preferencesSubmittedAt: {
    type: Date,
    default: null,
  },
});

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);