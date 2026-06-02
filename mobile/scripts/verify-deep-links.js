/**
 * Quick sanity check for deep-link URL parsing (no device required).
 * Usage: node scripts/verify-deep-links.js
 */

function parseTokenFromUrl(url) {
  try {
    const parsed = new URL(url);
    const fromQuery = parsed.searchParams.get('token');
    if (fromQuery) return fromQuery;
  } catch {
    /* fall through */
  }
  const match = url.match(/[?&]token=([^&]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function parseAuthLink(url) {
  const token = parseTokenFromUrl(url);
  if (!token) return null;
  const lower = url.toLowerCase();
  if (lower.includes('reset-password')) return { screen: 'ResetPassword', token };
  if (lower.includes('verify-email')) return { screen: 'VerifyEmail', token };
  return null;
}

const cases = [
  'pomodoria://reset-password?token=abc123',
  'pomodoria://verify-email?token=verify456',
  'http://localhost:5173/reset-password?token=web789',
  'http://127.0.0.1:5173/verify-email?token=web-verify',
];

let failed = 0;
for (const url of cases) {
  const result = parseAuthLink(url);
  const ok = result && result.token;
  console.log(ok ? '[OK]' : '[FAIL]', url, '→', result);
  if (!ok) failed += 1;
}

process.exit(failed ? 1 : 0);
