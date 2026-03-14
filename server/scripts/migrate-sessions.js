/**
 * One-time migration script for session-based allotment refactor.
 *
 * Run BEFORE deploying the session-aware code:
 *   node server/scripts/migrate-sessions.js
 *
 * What it does:
 *   1. Pre-flight: checks for duplicate preferences by userId (must be zero)
 *   2. Drops the old unique index { userId: 1 } on the preferences collection
 *   3. Logs counts of users/preferences without a sessionId (expected: all of them pre-migration)
 *
 * After running this script, restart the server — Mongoose will auto-create the
 * new compound index { userId: 1, sessionId: 1 } on startup.
 *
 * Existing documents with sessionId: null are safe because MongoDB treats
 * { userId: X, sessionId: null } as a unique combination per pair.
 */

import 'dotenv/config';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('[MIGRATE] MONGODB_URI is not set. Aborting.');
  process.exit(1);
}

async function run() {
  console.log('[MIGRATE] Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('[MIGRATE] Connected.');

  const db = mongoose.connection.db;

  // ── 1. Pre-flight: check for duplicate preferences by userId ──────────────
  console.log('[MIGRATE] Pre-flight: checking for duplicate preferences...');
  const dupPipeline = [
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ];
  const duplicates = await db.collection('preferences').aggregate(dupPipeline).toArray();
  if (duplicates.length > 0) {
    console.error('[MIGRATE] ❌ Found duplicate preference records for the following userIds:');
    duplicates.forEach(d => console.error('  userId:', d._id, '— count:', d.count));
    console.error('[MIGRATE] Resolve duplicates manually before re-running this migration.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log('[MIGRATE] ✅ No duplicate preferences found.');

  // ── 2. Drop old unique index { userId: 1 } ────────────────────────────────
  console.log('[MIGRATE] Dropping old unique index { userId: 1 } on preferences...');
  try {
    await db.collection('preferences').dropIndex('userId_1');
    console.log('[MIGRATE] ✅ Old index dropped.');
  } catch (err) {
    if (err.codeName === 'IndexNotFound' || err.code === 27) {
      console.log('[MIGRATE] ℹ️  Index userId_1 not found — already dropped or never existed.');
    } else {
      throw err;
    }
  }

  // ── 3. Log counts of documents without sessionId ──────────────────────────
  const usersWithoutSession  = await db.collection('users').countDocuments({ sessionId: { $exists: false } });
  const prefsWithoutSession  = await db.collection('preferences').countDocuments({ sessionId: { $exists: false } });
  const eventsWithoutSession = await db.collection('allotmentevents').countDocuments({ sessionId: { $exists: false } });

  console.log(`[MIGRATE] Users without sessionId:          ${usersWithoutSession}`);
  console.log(`[MIGRATE] Preferences without sessionId:    ${prefsWithoutSession}`);
  console.log(`[MIGRATE] AllotmentEvents without sessionId: ${eventsWithoutSession}`);
  console.log('[MIGRATE] These will default to null — safe for the new compound index.');

  console.log('');
  console.log('[MIGRATE] ✅ Migration complete.');
  console.log('[MIGRATE] Restart the server — Mongoose will create the new compound index { userId:1, sessionId:1 }.');

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('[MIGRATE] Fatal error:', err);
  process.exit(1);
});
