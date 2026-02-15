const express = require('express');
const router = express.Router();
const { authLimiter } = require('../middleware/rateLimiters');
const { emailLogin, emailRegister, walletLogin, walletRegister } = require('../controllers/authController');

router.post('/auth/email/login', authLimiter, emailLogin);
router.post('/auth/email/register', authLimiter, emailRegister);
router.post('/auth/wallet/login', authLimiter, walletLogin);
router.post('/auth/wallet/register', authLimiter, walletRegister);

module.exports = router;
