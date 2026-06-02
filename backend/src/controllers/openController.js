const {
  buildExpoGoUrl,
  buildMobilePasswordResetUrl,
  buildMobileVerificationUrl,
  buildWebPasswordResetUrl,
  buildWebVerificationUrl,
} = require('../utils/publicUrls');

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderAuthLandingPage({ title, intro, token, webUrl, mobileSchemeUrl, expoUrl }) {
  const safeToken = escapeHtml(token);
  const safeWeb = escapeHtml(webUrl);
  const safeMobile = mobileSchemeUrl ? escapeHtml(mobileSchemeUrl) : '';
  const safeExpo = expoUrl ? escapeHtml(expoUrl) : '';

  const expoBlock = safeExpo
    ? `<p><a class="btn primary" href="${safeExpo}">Open in Expo Go (development)</a></p>`
    : '';
  const mobileBlock = safeMobile
    ? `<p><a class="btn" href="${safeMobile}">Open in installed app</a></p>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 32rem; margin: 2rem auto; padding: 0 1rem; color: #1f2937; line-height: 1.5; }
    h1 { font-size: 1.35rem; margin-bottom: 0.5rem; }
    .muted { color: #6b7280; font-size: 0.95rem; }
    .btn { display: inline-block; margin: 0.35rem 0; padding: 0.65rem 1rem; border-radius: 8px; background: #f3f4f6; color: #111827; text-decoration: none; font-weight: 600; }
    .btn.primary { background: #5b3256; color: #fff; }
    code { word-break: break-all; font-size: 0.8rem; background: #f9fafb; padding: 0.2rem 0.35rem; border-radius: 4px; }
    .warn { margin-top: 1.25rem; padding: 0.75rem; background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">${escapeHtml(intro)}</p>
  <p><a class="btn primary" href="${safeWeb}">Continue on web</a></p>
  ${expoBlock}
  ${mobileBlock}
  <p class="muted">Token (manual paste in app if needed):<br /><code>${safeToken}</code></p>
  <div class="warn">
  <strong>Local development:</strong> Web link needs <code>npm run dev</code> in <code>frontend-web</code>.
  Set <code>APP_PUBLIC_URL</code> to your PC LAN IP (not localhost) when opening email on your phone.
  </div>
</body>
</html>`;
}

const openVerifyEmail = (req, res) => {
  const token =
    (typeof req.query.token === 'string' && req.query.token.trim()) || '';
  if (!token) {
    return res.status(400).send('Missing token query parameter.');
  }

  const webUrl = buildWebVerificationUrl(token);
  const html = renderAuthLandingPage({
    title: 'Verify your email',
    intro: 'Choose how you want to open Pomodoria:',
    token,
    webUrl,
    mobileSchemeUrl: buildMobileVerificationUrl(token),
    expoUrl: buildExpoGoUrl(`/verify-email?token=${encodeURIComponent(token)}`),
  });
  return res.type('html').send(html);
};

const openResetPassword = (req, res) => {
  const token =
    (typeof req.query.token === 'string' && req.query.token.trim()) || '';
  if (!token) {
    return res.status(400).send('Missing token query parameter.');
  }

  const webUrl = buildWebPasswordResetUrl(token);
  const html = renderAuthLandingPage({
    title: 'Reset your password',
    intro: 'Choose how you want to reset your Pomodoria password:',
    token,
    webUrl,
    mobileSchemeUrl: buildMobilePasswordResetUrl(token),
    expoUrl: buildExpoGoUrl(`/reset-password?token=${encodeURIComponent(token)}`),
  });
  return res.type('html').send(html);
};

module.exports = {
  openVerifyEmail,
  openResetPassword,
};
