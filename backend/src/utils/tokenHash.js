const crypto = require('crypto');

const hashToken = (raw) =>
  crypto.createHash('sha256').update(String(raw)).digest('hex');

const generateSecureToken = () => crypto.randomBytes(32).toString('hex');

module.exports = {
  hashToken,
  generateSecureToken,
};
