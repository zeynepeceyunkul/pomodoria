const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Settings = require('../models/Settings');
const {
  validateRegisterBody,
  validateLoginBody,
  isValidEmail,
} = require('../utils/authValidation');
const { hashToken, generateSecureToken } = require('../utils/tokenHash');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const {
  sendVerificationEmail,
  VERIFICATION_EXPIRY_HOURS,
  isSmtpConfigured,
} = require('../services/emailService');

const withVerificationMeta = (payload, emailResult) => {
  const next = { ...payload };
  if (emailResult?.delivered) {
    next.emailDelivered = true;
    return next;
  }
  if (emailResult?.devLink && process.env.NODE_ENV !== 'production') {
    next.emailDelivered = false;
    next.devVerificationUrl = emailResult.devLink;
    next.message =
      (next.message ? `${next.message} ` : '') +
      'SMTP is not configured — use the verification link shown below (development only).';
  }
  return next;
};

const userPayload = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  level: user.level,
  xp: user.xp,
  streak: user.streak,
  emailVerified: user.emailVerified !== false,
});

/** Legacy accounts without the field are treated as verified. */
const isEmailVerified = (user) => user.emailVerified !== false;

const issueTokens = async (user) => {
  const refreshToken = signRefreshToken(user._id);
  const refreshHash = hashToken(refreshToken);
  const refreshMs = 7 * 24 * 60 * 60 * 1000;
  user.refreshTokenHash = refreshHash;
  user.refreshTokenExpires = new Date(Date.now() + refreshMs);
  await user.save();

  return {
    token: signAccessToken(user._id),
    refreshToken,
    user: userPayload(user),
  };
};

const scheduleVerificationEmail = async (user) => {
  const rawToken = generateSecureToken();
  user.emailVerificationTokenHash = hashToken(rawToken);
  user.emailVerificationExpires = new Date(
    Date.now() + VERIFICATION_EXPIRY_HOURS * 60 * 60 * 1000,
  );
  user.emailVerified = false;
  await user.save();
  return sendVerificationEmail(user.email, rawToken);
};

const register = async (req, res) => {
  try {
    const validationError = validateRegisterBody(req.body);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

    const rawUsername =
      typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const rawName = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const name = rawUsername || rawName;
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = req.body.password;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      if (!isEmailVerified(existingUser)) {
        const emailResult = await scheduleVerificationEmail(existingUser);
        return res.status(200).json(
          withVerificationMeta(
            {
              requiresEmailVerification: true,
              email: existingUser.email,
              message: isSmtpConfigured()
                ? 'This email is already registered but not verified. We sent a new verification link.'
                : 'This email is already registered but not verified.',
            },
            emailResult,
          ),
        );
      }
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      emailVerified: false,
    });

    await Settings.create({ userId: user._id });
    const emailResult = await scheduleVerificationEmail(user);

    return res.status(201).json(
      withVerificationMeta(
        {
          requiresEmailVerification: true,
          email: user.email,
          message: isSmtpConfigured()
            ? 'Account created. Check your email to verify before signing in.'
            : 'Account created. Verify your email using the link below.',
        },
        emailResult,
      ),
    );
  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email is already registered' });
    }
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

const login = async (req, res) => {
  try {
    const loginError = validateLoginBody(req.body);
    if (loginError) {
      return res.status(400).json({ message: loginError });
    }

    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    const password = req.body.password;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!isEmailVerified(user)) {
      return res.status(403).json({
        message: 'Please verify your email before signing in.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const tokens = await issueTokens(user);
    return res.status(200).json(tokens);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const rawToken =
      (typeof req.body?.token === 'string' && req.body.token.trim()) ||
      (typeof req.query?.token === 'string' && req.query.token.trim()) ||
      '';

    if (!rawToken) {
      return res.status(400).json({ message: 'Verification token is required.' });
    }

    const tokenHash = hashToken(rawToken);
    const user = await User.findOne({ emailVerificationTokenHash: tokenHash });

    if (!user) {
      return res.status(400).json({
        message:
          'Invalid or expired verification link. If you requested a new email, use only the latest link.',
        code: 'VERIFY_INVALID',
      });
    }

    if (user.emailVerificationExpires && user.emailVerificationExpires <= new Date()) {
      return res.status(400).json({
        message: 'Verification link has expired. Please request a new one.',
        code: 'VERIFY_EXPIRED',
        email: user.email,
      });
    }

    if (user.emailVerified === true) {
      return res.status(200).json({
        message: 'Email is already verified. You can sign in now.',
        email: user.email,
        verified: true,
      });
    }

    user.emailVerified = true;
    await user.save();

    return res.status(200).json({
      message: 'Email verified successfully. Please sign in with your password.',
      email: user.email,
      verified: true,
    });
  } catch (error) {
    console.error('Verify email error:', error);
    return res.status(500).json({ message: 'Server error during email verification' });
  }
};

const resendVerification = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim() : '';
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(200).json({
        message: 'If that email is registered and unverified, a new link was sent.',
      });
    }

    if (isEmailVerified(user)) {
      return res.status(400).json({ message: 'This email is already verified. You can sign in.' });
    }

    const emailResult = await scheduleVerificationEmail(user);
    return res.status(200).json(
      withVerificationMeta(
        {
          message: isSmtpConfigured()
            ? 'Verification email sent. Check your inbox.'
            : 'Verification link generated (no SMTP).',
          email: user.email,
        },
        emailResult,
      ),
    );
  } catch (error) {
    console.error('Resend verification error:', error);
    return res.status(500).json({ message: 'Server error while sending verification email' });
  }
};

const refresh = async (req, res) => {
  try {
    const refreshToken =
      typeof req.body.refreshToken === 'string' ? req.body.refreshToken.trim() : '';

    if (!refreshToken) {
      return res.status(400).json({ message: 'Refresh token is required.' });
    }

    let userId;
    try {
      ({ userId } = verifyRefreshToken(refreshToken));
    } catch {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const user = await User.findById(userId);
    if (!user || !isEmailVerified(user)) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const tokenHash = hashToken(refreshToken);
    if (
      !user.refreshTokenHash ||
      user.refreshTokenHash !== tokenHash ||
      !user.refreshTokenExpires ||
      user.refreshTokenExpires <= new Date()
    ) {
      return res.status(401).json({ message: 'Invalid or expired refresh token.' });
    }

    const tokens = await issueTokens(user);
    return res.status(200).json(tokens);
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ message: 'Server error during token refresh' });
  }
};

const logout = async (req, res) => {
  try {
    const refreshToken =
      typeof req.body.refreshToken === 'string' ? req.body.refreshToken.trim() : '';

    if (refreshToken) {
      try {
        const { userId } = verifyRefreshToken(refreshToken);
        const user = await User.findById(userId);
        if (user) {
          const tokenHash = hashToken(refreshToken);
          if (user.refreshTokenHash === tokenHash) {
            user.refreshTokenHash = null;
            user.refreshTokenExpires = null;
            await user.save();
          }
        }
      } catch {
        /* ignore invalid token on logout */
      }
    }

    return res.status(200).json({ message: 'Signed out successfully.' });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({ message: 'Server error during logout' });
  }
};

module.exports = {
  register,
  login,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
};
