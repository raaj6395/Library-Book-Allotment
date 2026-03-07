import { logger } from '../utils/logger.js';

const CRITICAL_VARS = ['MONGODB_URI'];

const OPTIONAL_VARS = [
  'GMAIL_USER',
  'GMAIL_APP_PASSWORD',
  'PORT',
  'RANK_W1',
  'RANK_W2',
  'RANK_W3',
];

/**
 * Validates environment variables at startup.
 *
 * @param {NodeJS.ProcessEnv} env – defaults to process.env; override in tests
 * @returns {{ PORT, MONGODB_URI, GMAIL_USER, GMAIL_APP_PASSWORD, emailEnabled }}
 * @throws {Error} if any critical variable is missing
 */
export function validateEnv(env = process.env) {
  const missing = CRITICAL_VARS.filter(v => !env[v]);

  if (missing.length > 0) {
    const list = missing.join(', ');
    logger.error(`[ENV] Missing critical environment variables: ${list}`);
    logger.error('[ENV] Create a .env file based on .env.example and set all required variables');
    throw new Error(`Missing critical environment variables: ${list}`);
  }

  const missingOptional = OPTIONAL_VARS.filter(v => !env[v]);
  if (missingOptional.length > 0) {
    logger.warn(`[ENV] Optional variables not set: ${missingOptional.join(', ')}`);
  }

  logger.info('[ENV] All required environment variables are present');

  return {
    PORT:              parseInt(env.PORT, 10) || 3001,
    MONGODB_URI:       env.MONGODB_URI,
    GMAIL_USER:        env.GMAIL_USER ?? null,
    GMAIL_APP_PASSWORD: env.GMAIL_APP_PASSWORD ?? null,
    emailEnabled:      !!(env.GMAIL_USER && env.GMAIL_APP_PASSWORD),
  };
}
