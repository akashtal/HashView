const rateLimit = require('express-rate-limit');

// Rate limit based on businessId in req.body
// Maximum 500 orders per 15 minutes per business
exports.businessOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  keyGenerator: (req) => req.body.businessId || 'unknown_business',
  message: {
    success: false,
    message: 'This restaurant is receiving an unusually high volume of orders right now. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
