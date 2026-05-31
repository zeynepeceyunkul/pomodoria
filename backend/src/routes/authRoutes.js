const express = require('express');
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  refresh,
  logout,
} = require('../controllers/authController');
const authRateLimit = require('../middlewares/authRateLimit');

const router = express.Router();

router.use(authRateLimit);

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.get('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/refresh', refresh);
router.post('/logout', logout);

module.exports = router;
