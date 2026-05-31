const jwt = require('jsonwebtoken');

const ISSUER = 'pomodoria-api';
const AUDIENCE = 'pomodoria-app';

const assertSecret = (secret, name) => {
  if (!secret) {
    throw new Error(`${name} is not defined in environment variables`);
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production`);
  }
  return secret;
};

const getAccessSecret = () => assertSecret(process.env.JWT_SECRET, 'JWT_SECRET');

const getRefreshSecret = () =>
  assertSecret(process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 'JWT_REFRESH_SECRET');

const signAccessToken = (userId) =>
  jwt.sign(
    { typ: 'access' },
    getAccessSecret(),
    {
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
      subject: String(userId),
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );

const signRefreshToken = (userId) =>
  jwt.sign(
    { typ: 'refresh' },
    getRefreshSecret(),
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      subject: String(userId),
      issuer: ISSUER,
      audience: AUDIENCE,
    },
  );

const verifyAccessToken = (token) => {
  const decoded = jwt.verify(token, getAccessSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (decoded.typ !== 'access') {
    throw new Error('Invalid token type');
  }
  return { userId: decoded.sub };
};

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, getRefreshSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE,
  });
  if (decoded.typ !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { userId: decoded.sub };
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
