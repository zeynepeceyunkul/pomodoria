const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MIN_USERNAME_LENGTH = 2;
const MAX_USERNAME_LENGTH = 32;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isNonEmptyString = (value) =>
  typeof value === 'string' && value.trim().length > 0;

const isValidEmail = (email) => {
  if (!isNonEmptyString(email)) return false;
  return EMAIL_REGEX.test(email.trim().toLowerCase());
};

const validateUsername = (name) => {
  const trimmed = typeof name === 'string' ? name.trim() : '';
  if (!trimmed) return 'Username is required.';
  if (trimmed.length < MIN_USERNAME_LENGTH) {
    return `Username must be at least ${MIN_USERNAME_LENGTH} characters.`;
  }
  if (trimmed.length > MAX_USERNAME_LENGTH) {
    return `Username must be at most ${MAX_USERNAME_LENGTH} characters.`;
  }
  if (!/^[a-zA-Z0-9_\-. ]+$/.test(trimmed)) {
    return 'Username may only contain letters, numbers, spaces, and _ - .';
  }
  return null;
};

const validatePassword = (password) => {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.';
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include at least one number.';
  }
  return null;
};

const validateRegisterBody = (body) => {
  const rawUsername =
    typeof body.username === 'string' ? body.username.trim() : '';
  const rawName = typeof body.name === 'string' ? body.name.trim() : '';
  const name = rawUsername || rawName;
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = body.password;

  const usernameError = validateUsername(name);
  if (usernameError) return usernameError;

  if (!isValidEmail(email)) return 'A valid email is required.';

  const passwordError = validatePassword(password);
  if (passwordError) return passwordError;

  return null;
};

const validateLoginBody = (body) => {
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = body.password;

  if (!isValidEmail(email)) return 'A valid email is required.';
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required.';
  }

  return null;
};

module.exports = {
  MIN_PASSWORD_LENGTH,
  validateRegisterBody,
  validateLoginBody,
  validatePassword,
  validateUsername,
  isValidEmail,
};
