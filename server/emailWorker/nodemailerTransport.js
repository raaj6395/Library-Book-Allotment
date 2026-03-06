import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      `Email credentials not configured — GMAIL_USER: ${user ? 'set' : 'MISSING'}, GMAIL_APP_PASSWORD: ${pass ? 'set' : 'MISSING'}`
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
  }

  return transporter;
}

export default getTransporter;
