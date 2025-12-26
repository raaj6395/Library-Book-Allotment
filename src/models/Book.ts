import mongoose, { Schema, Document } from 'mongoose';

interface IBook extends Document {
  title: string;
  author?: string | null;
  isbn?: string | null;
  category?: string | null;
  copies?: number;
  description?: string | null;
  isDeleted: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const BookSchema = new Schema<IBook>(
  {
    title: { type: String, required: true, trim: true },
    author: { type: String, default: null, trim: true },
    isbn: { type: String, default: null, trim: true },
    category: { type: String, default: null, trim: true },
    copies: { type: Number, default: 1 },
    description: { type: String, default: null },
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// helper to get non-deleted books
BookSchema.statics.findActive = function (filter = {}) {
  return this.find({ ...filter, isDeleted: false });
};

export default mongoose.models.Book || mongoose.model<IBook>('Book', BookSchema);