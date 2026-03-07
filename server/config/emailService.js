import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';
import { setServiceStatus } from '../utils/serviceRegistry.js';

/** The single shared transporter instance; null when email is unavailable. */
let transporter = null;

/**
 * Initialises the Nodemailer transporter and verifies the SMTP connection.
 *
 * This is a non-critical service: if it fails, the server continues running
 * but email-dependent features are disabled.
 *
 * @param {{ user: string|null, pass: string|null }} credentials
 * @returns {Promise<boolean>} true when SMTP is ready, false otherwise
 */
export async function initEmailService({ user, pass }) {
  setServiceStatus('email', 'initializing', 'Verifying SMTP connection…');

  if (!user || !pass) {
    const msg = 'GMAIL_USER or GMAIL_APP_PASSWORD not set — email notifications disabled';
    logger.warn(`[EMAIL] ${msg}`);
    logger.warn('[EMAIL] Add both variables to .env and restart to enable email notifications');
    setServiceStatus('email', 'disabled', msg);
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });

    await transporter.verify();
    logger.info(`[EMAIL] SMTP verified — sending as ${user}`);
    setServiceStatus('email', 'healthy', `Gmail SMTP ready (${user})`);
    return true;
  } catch (err) {
    const msg = `SMTP verification failed: ${err.message}`;
    logger.error(`[EMAIL] ${msg}`);
    logger.error('[EMAIL] Double-check GMAIL_USER and GMAIL_APP_PASSWORD');
    logger.error('[EMAIL] Make sure you are using a Gmail App Password, not your account password');
    transporter = null;
    setServiceStatus('email', 'failed', msg);
    return false;
  }
}

/** Returns the active transporter, or null if email is unavailable. */
export function getEmailTransporter() {
  return transporter;
}

/** True when SMTP is configured and verified. */
export function isEmailAvailable() {
  return transporter !== null;
}
