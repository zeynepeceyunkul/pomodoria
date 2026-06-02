const express = require('express');
const { openResetPassword, openVerifyEmail } = require('../controllers/openController');

const router = express.Router();

router.get('/verify-email', openVerifyEmail);
router.get('/reset-password', openResetPassword);

module.exports = router;
