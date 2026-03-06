import EmailQueue from '../models/emailQueue.model.js';

export async function addEmailToQueue({ sendToEmail, title, subject }) {
  await EmailQueue.create({ sendToEmail, title, subject });
}
