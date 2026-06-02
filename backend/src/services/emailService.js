const nodemailer = require('nodemailer');
const {
  buildOpenPasswordResetUrl,
  buildOpenVerificationUrl,
  buildWebPasswordResetUrl,
  buildWebVerificationUrl,
  buildMobilePasswordResetUrl,
  buildMobileVerificationUrl,
  buildExpoGoUrl,
} = require('../utils/publicUrls');

const VERIFICATION_EXPIRY_HOURS = Number(process.env.EMAIL_VERIFY_EXPIRES_HOURS) || 24;
const PASSWORD_RESET_EXPIRY_HOURS = Number(process.env.PASSWORD_RESET_EXPIRES_HOURS) || 1;

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

const appendMobileLink = (lines, mobileUrl, label) => {
  if (!mobileUrl) return;
  lines.push('', `${label}:`, mobileUrl);
};

const sendVerificationEmail = async (toEmail, rawToken) => {
  const openUrl = buildOpenVerificationUrl(rawToken);
  const webUrl = buildWebVerificationUrl(rawToken);
  const mobileUrl = buildMobileVerificationUrl(rawToken);
  const expoUrl = buildExpoGoUrl(`/verify-email?token=${encodeURIComponent(rawToken)}`);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@pomodoria.local';
  const subject = 'Verify your Pomodoria email';

  const textLines = [
    'Welcome to Pomodoria!',
    '',
    'Open this link to verify your email (works on phone and computer):',
    openUrl,
    '',
    'Web app direct link:',
    webUrl,
  ];
  appendMobileLink(textLines, expoUrl, 'Expo Go (development)');
  appendMobileLink(textLines, mobileUrl, 'Installed app');
  textLines.push(
    '',
    `This link expires in ${VERIFICATION_EXPIRY_HOURS} hours.`,
    '',
    'If you did not create an account, you can ignore this email.',
  );
  const text = textLines.join('\n');

  const html = `
    <p>Welcome to <strong>Pomodoria</strong>!</p>
    <p><a href="${openUrl}"><strong>Verify email</strong></a> (recommended — works on mobile and desktop)</p>
    <p><a href="${webUrl}">Verify on web</a> (requires dev server at ${webUrl.split('/verify')[0]})</p>
    ${expoUrl ? `<p><a href="${expoUrl}">Verify in Expo Go</a></p>` : ''}
    ${mobileUrl ? `<p><a href="${mobileUrl}">Verify in installed app</a></p>` : ''}
    <p style="font-size:12px;color:#666">Or copy: ${openUrl}</p>
    <p>This link expires in ${VERIFICATION_EXPIRY_HOURS} hours.</p>
  `;

  const transport = createTransport();

  if (!transport) {
    console.log('[EMAIL] SMTP not configured — verification links (dev):');
    console.log(`        Open:   ${openUrl}`);
    console.log(`        Web:    ${webUrl}`);
    if (expoUrl) console.log(`        Expo:   ${expoUrl}`);
    if (mobileUrl) console.log(`        App:    ${mobileUrl}`);
    return { delivered: false, devLink: openUrl, devMobileLink: expoUrl || mobileUrl };
  }

  await transport.sendMail({ from, to: toEmail, subject, text, html });
  return { delivered: true };
};

const sendPasswordResetEmail = async (toEmail, rawToken) => {
  const openUrl = buildOpenPasswordResetUrl(rawToken);
  const webUrl = buildWebPasswordResetUrl(rawToken);
  const mobileUrl = buildMobilePasswordResetUrl(rawToken);
  const expoUrl = buildExpoGoUrl(`/reset-password?token=${encodeURIComponent(rawToken)}`);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@pomodoria.local';
  const subject = 'Reset your Pomodoria password';

  const textLines = [
    'You requested a password reset for Pomodoria.',
    '',
    'Open this link to reset your password (works on phone and computer):',
    openUrl,
    '',
    'Web app direct link:',
    webUrl,
  ];
  appendMobileLink(textLines, expoUrl, 'Expo Go (development)');
  appendMobileLink(textLines, mobileUrl, 'Installed app');
  textLines.push(
    '',
    `This link expires in ${PASSWORD_RESET_EXPIRY_HOURS} hour(s).`,
    '',
    'If you did not request this, you can ignore this email.',
  );
  const text = textLines.join('\n');

  const html = `
    <p>You requested a password reset for <strong>Pomodoria</strong>.</p>
    <p><a href="${openUrl}"><strong>Reset password</strong></a> (recommended — works on mobile and desktop)</p>
    <p><a href="${webUrl}">Reset on web</a> (requires dev server running)</p>
    ${expoUrl ? `<p><a href="${expoUrl}">Reset in Expo Go</a></p>` : ''}
    ${mobileUrl ? `<p><a href="${mobileUrl}">Reset in installed app</a></p>` : ''}
    <p style="font-size:12px;color:#666">Or copy: ${openUrl}</p>
    <p>This link expires in ${PASSWORD_RESET_EXPIRY_HOURS} hour(s).</p>
  `;

  const transport = createTransport();

  if (!transport) {
    console.log('[EMAIL] SMTP not configured — password reset links (dev):');
    console.log(`        Open:   ${openUrl}`);
    console.log(`        Web:    ${webUrl}`);
    if (expoUrl) console.log(`        Expo:   ${expoUrl}`);
    if (mobileUrl) console.log(`        App:    ${mobileUrl}`);
    return { delivered: false, devLink: openUrl, devMobileLink: expoUrl || mobileUrl };
  }

  await transport.sendMail({ from, to: toEmail, subject, text, html });
  return { delivered: true };
};

module.exports = {
  VERIFICATION_EXPIRY_HOURS,
  PASSWORD_RESET_EXPIRY_HOURS,
  sendVerificationEmail,
  sendPasswordResetEmail,
  buildVerificationUrl: buildWebVerificationUrl,
  buildPasswordResetUrl: buildWebPasswordResetUrl,
  buildMobileVerificationUrl,
  buildMobilePasswordResetUrl,
  isSmtpConfigured,
};
