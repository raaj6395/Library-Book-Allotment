import mongoose from 'mongoose';
import User from '../models/User';

// ...existing code or run script bootstrap...

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI!);
  const res = await User.updateMany(
    { $or: [{ cpi: null }, { cpi: { $exists: false } }] },
    { $set: { cpi: 0 } }
  );
  console.log(`Backfilled ${res.nModified ?? res.modifiedCount} users with default cpi=0`);
  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
