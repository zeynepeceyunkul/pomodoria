const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  getMe,
  getProgress,
  getSettings,
  updateSettings,
} = require('../controllers/userController');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware);

// GET /api/users/me
router.get('/me', getMe);

// GET /api/users/progress
router.get('/progress', getProgress);

// GET /api/users/settings
router.get('/settings', getSettings);

// PUT /api/users/settings
router.put('/settings', updateSettings);

module.exports = router;

