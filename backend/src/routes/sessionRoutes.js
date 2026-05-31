const express = require('express');
const authMiddleware = require('../middlewares/authMiddleware');
const {
  createSession,
  getMySessions,
  getSessionStats,
  getSessionAnalytics,
} = require('../controllers/sessionController');

const router = express.Router();

// All session routes require authentication
router.use(authMiddleware);

// POST /api/sessions
router.post('/', createSession);

// GET /api/sessions/me
router.get('/me', getMySessions);

// GET /api/sessions/stats
router.get('/stats', getSessionStats);

// GET /api/sessions/analytics
router.get('/analytics', getSessionAnalytics);

module.exports = router;

