const rateLimit = require('express-rate-limit');
const { rateLimits } = require('../config');

// Authentication rate limiting
const authLimiter = rateLimit({
  windowMs: rateLimits.auth.windowMs,
  max: rateLimits.auth.max,
  message: { error: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true,
});

// General API rate limiting
const limiter = rateLimit({
  windowMs: rateLimits.api.windowMs,
  max: rateLimits.api.max,
});

// Admin rate limiting (stricter)
const adminLimiter = rateLimit({
  windowMs: rateLimits.admin.windowMs,
  max: rateLimits.admin.max,
});

// Evidence export rate limiting
const exportLimiter = rateLimit({
  windowMs: rateLimits.export.windowMs,
  max: rateLimits.export.max,
});

// Rate limiter for case timeline pages
const timelineLimiter = rateLimit({
  windowMs: rateLimits.timeline.windowMs,
  max: rateLimits.timeline.max,
});

// Rate limiter for public policy pages
const policyPageLimiter = rateLimit({
  windowMs: rateLimits.policy.windowMs,
  max: rateLimits.policy.max,
});

// Blockchain operations rate limiting
const blockchainLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Blockchain operation limit exceeded. Maximum 10 operations per minute.' },
  standardHeaders: true,
});

// Evidence upload rate limiting
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Upload limit exceeded. Maximum 50 uploads per hour.' },
  standardHeaders: true,
});

// Verification rate limiting
const verificationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Verification limit exceeded. Maximum 30 verifications per minute.' },
  standardHeaders: true,
});

module.exports = {
  authLimiter,
  limiter,
  adminLimiter,
  exportLimiter,
  timelineLimiter,
  policyPageLimiter,
  blockchainLimiter,
  uploadLimiter,
  verificationLimiter,
};
