import EmailQueue from './emailQueue.model.js';
import transporter from './nodemailerTransport.js';

const MAX_ATTEMPTS = 3;
const POLL_INTERVAL_MS = 5000;

async function processNextJob() {
  // Atomically claim one pending job → prevents race conditions
  const job = await EmailQueue.findOneAndUpdate(
    { status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true }
  );

  if (!job) return; // nothing to do

  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: job.sendToEmail,
      subject: job.title,
      html: job.subject,
    });

    job.status = 'done';
    await job.save();
    console.log(`✅ Email sent to ${job.sendToEmail} [id: ${job._id}]`);
  } catch (err) {
    job.attempts += 1;

    if (job.attempts >= MAX_ATTEMPTS) {
      job.status = 'failed';
      job.error = err.message;
      console.error(`❌ Email permanently failed for ${job.sendToEmail} [id: ${job._id}]:`, err.message);
    } else {
      job.status = 'pending'; // re-queue for retry
      console.warn(`⚠️  Email failed (attempt ${job.attempts}/${MAX_ATTEMPTS}) for ${job.sendToEmail}, will retry.`);
    }

    await job.save();
  }
}

export function startEmailWorker() {
  console.log('📧 Email worker started — polling every', POLL_INTERVAL_MS / 1000, 'seconds');
  setInterval(processNextJob, POLL_INTERVAL_MS);
}
