const nodemailer = require('nodemailer');

const VERIFICATION_EXPIRY_HOURS = Number(process.env.EMAIL_VERIFY_EXPIRES_HOURS) || 24;

const isSmtpConfigured = () =>
  Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

const createTransport = () => {
  if (!isSmtpConfigured()) return null;

  const port = Number(process.env.SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const getPublicAppUrl = () => {
  const url = (process.env.APP_PUBLIC_URL || 'http://localhost:5173').replace(/\/$/, '');
  return url;
};

const buildVerificationUrl = (rawToken) =>
  `${getPublicAppUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;

const sendVerificationEmail = async (toEmail, rawToken) => {
  const verifyUrl = buildVerificationUrl(rawToken);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@pomodoria.local';
  const subject = 'Verify your Pomodoria email';
  const text = [
    'Welcome to Pomodoria!',
    '',
    'Please verify your email address by opening this link:',
    verifyUrl,
    '',
    `This link expires in ${VERIFICATION_EXPIRY_HOURS} hours.`,
    '',
    'If you did not create an account, you can ignore this email.',
  ].join('\n');

  const html = `
    <p>Welcome to <strong>Pomodoria</strong>!</p>
    <p>Please verify your email address:</p>
    <p><a href="${verifyUrl}">Verify email</a></p>
    <p>Or copy this link: ${verifyUrl}</p>
    <p>This link expires in ${VERIFICATION_EXPIRY_HOURS} hours.</p>
  `;

  const transport = createTransport();

  if (!transport) {
    console.log('[EMAIL] SMTP not configured — verification link (dev):');
    console.log(`        ${verifyUrl}`);
    return { delivered: false, devLink: verifyUrl };
  }

  await transport.sendMail({
    from,
    to: toEmail,
    subject,
    text,
    html,
  });

  return { delivered: true };
};

module.exports = {
  VERIFICATION_EXPIRY_HOURS,
  sendVerificationEmail,
  buildVerificationUrl,
  isSmtpConfigured,
};
