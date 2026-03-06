import EmailQueue from './emailQueue.model.js';
import getTransporter from './nodemailerTransport.js';

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
    const transporter = getTransporter();
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
      console.error(`❌ Email permanently failed for ${job.sendToEmail} [id: ${job._id}]`);
      console.error(`   Reason: ${err.message}`);
      console.error(`   GMAIL_USER: ${process.env.GMAIL_USER ?? 'NOT SET'}`);
      console.error(`   GMAIL_APP_PASSWORD: ${process.env.GMAIL_APP_PASSWORD ? '***set***' : 'NOT SET'}`);
    } else {
      job.status = 'pending'; // re-queue for retry
      console.warn(`⚠️  Email failed (attempt ${job.attempts}/${MAX_ATTEMPTS}) for ${job.sendToEmail}`);
      console.warn(`   Reason: ${err.message}`);
    }

    await job.save();
  }
}

export function startEmailWorker() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.error('❌ Email worker: missing credentials — emails will fail!');
    console.error(`   GMAIL_USER: ${user ?? 'NOT SET'}`);
    console.error(`   GMAIL_APP_PASSWORD: ${pass ? '***set***' : 'NOT SET'}`);
    console.error('   → Set these in your .env file and restart the server.');
  } else {
    console.log(`📧 Email worker started — sending as ${user}, polling every ${POLL_INTERVAL_MS / 1000}s`);
  }

  setInterval(processNextJob, POLL_INTERVAL_MS);
}
