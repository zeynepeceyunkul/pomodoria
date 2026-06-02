/**
 * Public URLs for emails and /open/* landing pages.
 * Use LAN IP in .env when testing on a phone (localhost only works on the same PC).
 */

const trimSlash = (url) => (url || '').replace(/\/$/, '');

const getPublicAppUrl = () =>
  trimSlash(process.env.APP_PUBLIC_URL || 'http://localhost:5173');

const getApiPublicUrl = () => {
  if (process.env.API_PUBLIC_URL) {
    return trimSlash(process.env.API_PUBLIC_URL);
  }
  const port = process.env.PORT || 5000;
  try {
    const web = new URL(getPublicAppUrl());
    if (web.hostname && web.hostname !== 'localhost' && web.hostname !== '127.0.0.1') {
      return `${web.protocol}//${web.hostname}:${port}`;
    }
  } catch {
    /* ignore */
  }
  return `http://localhost:${port}`;
};

const getMobileAppScheme = () => {
  const scheme = (process.env.MOBILE_APP_SCHEME || 'pomodoria').trim().replace(/:\/\/?$/, '');
  return scheme || 'pomodoria';
};

/** Expo Go deep link (custom scheme does not work in Expo Go from email). */
const buildExpoGoUrl = (pathWithQuery) => {
  const base = trimSlash(process.env.EXPO_DEV_URL || '');
  if (!base) return null;
  const path = pathWithQuery.startsWith('/') ? pathWithQuery : `/${pathWithQuery}`;
  return `${base}/--${path}`;
};

const buildWebVerificationUrl = (rawToken) =>
  `${getPublicAppUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;

const buildWebPasswordResetUrl = (rawToken) =>
  `${getPublicAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;

const buildOpenVerificationUrl = (rawToken) =>
  `${getApiPublicUrl()}/open/verify-email?token=${encodeURIComponent(rawToken)}`;

const buildOpenPasswordResetUrl = (rawToken) =>
  `${getApiPublicUrl()}/open/reset-password?token=${encodeURIComponent(rawToken)}`;

const buildMobileVerificationUrl = (rawToken) =>
  `${getMobileAppScheme()}://verify-email?token=${encodeURIComponent(rawToken)}`;

const buildMobilePasswordResetUrl = (rawToken) =>
  `${getMobileAppScheme()}://reset-password?token=${encodeURIComponent(rawToken)}`;

module.exports = {
  getPublicAppUrl,
  getApiPublicUrl,
  getMobileAppScheme,
  buildExpoGoUrl,
  buildWebVerificationUrl,
  buildWebPasswordResetUrl,
  buildOpenVerificationUrl,
  buildOpenPasswordResetUrl,
  buildMobileVerificationUrl,
  buildMobilePasswordResetUrl,
};
