import EmailQueue from '../models/emailQueue.model.js';
import { getEmailTransporter, isEmailAvailable } from '../config/emailService.js';
import { logger } from '../utils/logger.js';
import { setServiceStatus } from '../utils/serviceRegistry.js';

const MAX_ATTEMPTS        = 3;
const POLL_INTERVAL_MS    = 5_000;
const BASE_RETRY_DELAY_MS = 30_000; // 30 s → 60 s → 120 s

/**
 * Returns when a failed job should next be retried (exponential backoff).
 * Exported for unit testing.
 *
 * @param {number} attempts – number of attempts already made
 * @returns {Date}
 */
export function getNextRetryAt(attempts) {
  const delayMs = BASE_RETRY_DELAY_MS * Math.pow(2, attempts - 1);
  return new Date(Date.now() + delayMs);
}

async function processNextJob() {
  if (!isEmailAvailable()) return;

  const now = new Date();

  // Only pick up jobs whose retry window has elapsed
  const job = await EmailQueue.findOneAndUpdate(
    {
      status: 'pending',
      $or: [{ nextRetryAt: null }, { nextRetryAt: { $lte: now } }],
    },
    { $set: { status: 'processing' } },
    { new: true },
  );

  if (!job) return;

  try {
    const transporter = getEmailTransporter();
    await transporter.sendMail({
      from:    process.env.GMAIL_USER,
      to:      job.sendToEmail,
      subject: job.title,
      html:    job.subject,
    });

    job.status      = 'done';
    job.nextRetryAt = null;
    await job.save();

    logger.info(`[EMAIL WORKER] Sent to ${job.sendToEmail}`, { jobId: String(job._id) });
  } catch (err) {
    job.attempts += 1;
    job.error = err.message;

    if (job.attempts >= MAX_ATTEMPTS) {
      job.status = 'failed';
      logger.error(`[EMAIL WORKER] Permanently failed for ${job.sendToEmail}`, {
        jobId:    String(job._id),
        attempts: job.attempts,
        error:    err.message,
      });
    } else {
      job.status      = 'pending';
      job.nextRetryAt = getNextRetryAt(job.attempts);
      logger.warn(`[EMAIL WORKER] Send failed — will retry`, {
        jobId:       String(job._id),
        attempt:     job.attempts,
        maxAttempts: MAX_ATTEMPTS,
        nextRetryAt: job.nextRetryAt.toISOString(),
        error:       err.message,
      });
    }

    await job.save();
  }
}

/**
 * Starts the polling loop that drains the email queue.
 *
 * @param {boolean} emailAvailable – pass the result of initEmailService()
 */
export function startEmailWorker(emailAvailable) {
  if (!emailAvailable) {
    logger.warn('[EMAIL WORKER] Running in degraded mode — email sending is disabled');
    logger.warn('[EMAIL WORKER] Set GMAIL_USER and GMAIL_APP_PASSWORD in .env to enable');
    setServiceStatus('emailWorker', 'disabled', 'Email credentials not configured');
  } else {
    logger.info(`[EMAIL WORKER] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
    setServiceStatus('emailWorker', 'healthy', `Polling every ${POLL_INTERVAL_MS / 1000}s`);
  }

  setInterval(processNextJob, POLL_INTERVAL_MS);
}
