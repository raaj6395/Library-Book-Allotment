import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import { setServiceStatus } from '../utils/serviceRegistry.js';

const MAX_RETRIES   = 3;
const BASE_DELAY_MS = 2_000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connects to MongoDB with up to MAX_RETRIES attempts using exponential backoff.
 * Registers Mongoose event handlers to keep the service registry accurate at runtime.
 *
 * @param {string} uri – MongoDB connection string
 * @throws {Error} after all retry attempts are exhausted
 */
export async function connectDatabase(uri) {
  setServiceStatus('mongodb', 'initializing', 'Connecting…');

  mongoose.connection.on('disconnected', () => {
    logger.warn('[DB] MongoDB disconnected — waiting for reconnect');
    setServiceStatus('mongodb', 'degraded', 'Disconnected, attempting to reconnect');
  });

  mongoose.connection.on('reconnected', () => {
    logger.info('[DB] MongoDB reconnected');
    setServiceStatus('mongodb', 'healthy', 'Reconnected');
  });

  mongoose.connection.on('error', err => {
    logger.error('[DB] Runtime error', { error: err.message });
    setServiceStatus('mongodb', 'degraded', err.message);
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(uri);
      logger.info('[DB] Connected to MongoDB');
      setServiceStatus('mongodb', 'healthy', 'Connected');
      return;
    } catch (err) {
      logger.error(
        `[DB] Connection attempt ${attempt}/${MAX_RETRIES} failed`,
        { error: err.message },
      );

      if (attempt < MAX_RETRIES) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
        logger.info(`[DB] Retrying in ${delay / 1000}s…`);
        await sleep(delay);
      }
    }
  }

  const msg = `Could not connect to MongoDB after ${MAX_RETRIES} attempts`;
  setServiceStatus('mongodb', 'failed', msg);
  throw new Error(msg);
}
