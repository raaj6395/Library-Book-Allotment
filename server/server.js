import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { validateEnv }      from './config/env.js';
import { connectDatabase }  from './config/database.js';
import { initEmailService } from './config/emailService.js';
import { startEmailWorker } from './emailWorker/emailWorker.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { getAllServiceStatuses }          from './utils/serviceRegistry.js';
import { logger }                        from './utils/logger.js';

import authRoutes       from './routes/auth.route.js';
import bookRoutes       from './routes/books.route.js';
import userRoutes       from './routes/users.route.js';
import preferenceRoutes from './routes/preferences.route.js';
import allotmentRoutes  from './routes/allotment.route.js';

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function gracefulShutdown(signal) {
  logger.info(`[SHUTDOWN] ${signal} received — shutting down gracefully`);
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

// Catch unhandled rejections so the process never crashes silently
process.on('unhandledRejection', (reason) => {
  logger.error('[PROCESS] Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.error('[PROCESS] Uncaught exception — shutting down', { error: err.message, stack: err.stack });
  process.exit(1);
});

// ─── Startup orchestration ────────────────────────────────────────────────────

async function initServer() {
  logger.info('[STARTUP] ═══════════════════════════════════════════');
  logger.info('[STARTUP] Library Book Allotment Server starting…');
  logger.info('[STARTUP] ═══════════════════════════════════════════');

  // 1. Validate environment variables (critical — exit immediately on failure)
  let config;
  try {
    config = validateEnv();
  } catch {
    logger.error('[STARTUP] Environment validation failed — server will not start');
    logger.error('[STARTUP] Fix the issues above, then restart');
    process.exit(1);
  }

  // 2. Connect to MongoDB (critical — exit if all retries exhausted)
  try {
    await connectDatabase(config.MONGODB_URI);
  } catch (err) {
    logger.error('[STARTUP] MongoDB connection failed — server will not start', { error: err.message });
    process.exit(1);
  }

  // 3. Verify email SMTP (non-critical — server continues if this fails)
  const emailOk = await initEmailService({
    user: config.GMAIL_USER,
    pass: config.GMAIL_APP_PASSWORD,
  });

  // 4. Start the email queue worker
  startEmailWorker(emailOk);

  // ─── Express app ─────────────────────────────────────────────────────────────

  const app = express();

  app.use(cors());
  app.use(express.json());

  // ─── API routes ───────────────────────────────────────────────────────────────

  app.use('/api/auth',        authRoutes);
  app.use('/api/books',       bookRoutes);
  app.use('/api/users',       userRoutes);
  app.use('/api/preferences', preferenceRoutes);
  app.use('/api/allotment',   allotmentRoutes);

  // ─── Health check endpoint ───────────────────────────────────────────────────

  app.get('/api/health', (_req, res) => {
    const services  = getAllServiceStatuses();
    const allOk     = Object.values(services).every(
      s => s.status === 'healthy' || s.status === 'disabled',
    );

    res.status(allOk ? 200 : 207).json({
      status:    allOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    });
  });

  // ─── Error handling (must be last) ───────────────────────────────────────────

  app.use(notFoundHandler);
  app.use(errorHandler);

  // ─── Start listening ──────────────────────────────────────────────────────────

  app.listen(config.PORT, () => {
    logger.info('[STARTUP] ═══════════════════════════════════════════');
    logger.info(`[STARTUP] Server running on http://localhost:${config.PORT}`);
    logger.info(`[STARTUP] MongoDB  : healthy`);
    logger.info(`[STARTUP] Email    : ${emailOk ? 'healthy' : 'disabled'}`);
    logger.info('[STARTUP] ═══════════════════════════════════════════');

    if (!emailOk) {
      logger.warn('[STARTUP] Email notifications are DISABLED');
      logger.warn('[STARTUP] Set GMAIL_USER and GMAIL_APP_PASSWORD in .env to enable them');
    }
  });
}

initServer().catch(err => {
  console.error('[FATAL] Unexpected startup error:', err);
  process.exit(1);
});
