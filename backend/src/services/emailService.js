// ─── services/emailService.js ────────────────────────────────────
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html, text }) => {
  return transporter.sendMail({
    from: `"Nexus" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
    text,
  });
};

module.exports = { sendEmail };
