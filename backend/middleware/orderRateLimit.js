const rateLimit = require('express-rate-limit');

// Prevent order spam (e.g., someone automating cart checkout)
exports.orderCreationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // Limit each IP to 10 orders per window
  message: {
    success: false,
    message: 'Too many orders placed from this IP, please try again after 5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
