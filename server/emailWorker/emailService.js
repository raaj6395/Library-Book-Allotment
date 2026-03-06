import EmailQueue from '../models/emailQueue.model.js';

/**
 * Push an email job into the queue. Fire-and-forget — returns immediately.
 * @param {{ sendToEmail: string, title: string, subject: string }} job
 */
export async function addEmailToQueue({ sendToEmail, title, subject }) {
  await EmailQueue.create({ sendToEmail, title, subject });
}
