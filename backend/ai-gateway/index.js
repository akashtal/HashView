/**
 * AI Gateway — Express Sub-Application
 *
 * Mounted as a sub-app in the main Express server at /ai.
 * All AI routes are prefixed with /ai automatically.
 *
 * Routes:
 *   POST /ai/search    → Main AI search endpoint (7-layer pipeline)
 *   GET  /ai/health    → Provider health check
 *
 * Authentication:
 *   /ai/search requires a valid JWT (shared JWT secret with main backend)
 *   /ai/health is public (for infrastructure health monitoring)
 *
 * Design: This runs in the SAME Node.js process as the main Express backend.
 * This is intentional for Phase 2 — avoids the complexity of a separate service
 * while keeping clean code separation. Can be extracted to a separate process
 * in Phase 3+ if needed.
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const settings = require('./config/settings');

// Initialize router singleton on first import
const { getRouter } = require('./providers/router');
getRouter(); // Pre-warm so the first request isn't slow

const app = express.Router();

// ─── Auth Middleware (JWT, same secret as main backend) ───────────────────────
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, settings.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// Health check — public, no auth required
app.use('/health', require('./routes/health.route'));

// AI Search — requires authentication
app.use('/search', requireAuth, require('./routes/search.route'));

// ─── 404 for unknown AI routes ────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `AI Gateway route not found: ${req.method} ${req.path}`,
  });
});

module.exports = app;
