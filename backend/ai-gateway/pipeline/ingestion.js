/**
 * Pipeline Layer 1: Ingestion
 *
 * Validates and sanitizes the incoming search request.
 * Rejects malicious or malformed input before any AI call is made.
 *
 * Checks:
 *  - Query length limit (prevents prompt injection via huge queries)
 *  - Query sanitization (removes MongoDB injection operators)
 *  - Location validation (lat/lng must be valid numbers)
 *  - Rate limiting (enforced here via in-memory counter — Redis optional)
 */

const settings = require('../config/settings');

// In-memory rate limiting (per user, per minute).
// For production with multiple workers, replace with Redis.
const _rateLimitStore = new Map();

/**
 * Layer 1: Validate and sanitize the search request.
 *
 * @param {Object} req - Express request
 * @returns {{ query, location, userId, sessionId, options }} - Cleaned request data
 * @throws {Error} with .statusCode if validation fails
 */
function ingestRequest(req) {
  const body = req.body || {};
  const user = req.user; // Set by auth middleware

  // ─── 1. Extract and validate query ───────────────────────────────────────────
  let query = (body.query || '').trim();

  if (!query) {
    const err = new Error('Search query is required');
    err.statusCode = 400;
    throw err;
  }

  if (query.length > settings.search.maxQueryLength) {
    query = query.slice(0, settings.search.maxQueryLength);
  }

  // Strip MongoDB injection operators ($, {, })
  query = query.replace(/\$|\{|\}/g, '').replace(/[<>]/g, '').trim();

  if (!query) {
    const err = new Error('Query contains invalid characters');
    err.statusCode = 400;
    throw err;
  }

  // ─── 2. Location ──────────────────────────────────────────────────────────────
  let location = null;
  const lat = parseFloat(body.latitude);
  const lng = parseFloat(body.longitude);

  if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
    location = { latitude: lat, longitude: lng };
  }

  // ─── 3. Options (pagination, radius) ─────────────────────────────────────────
  const radius = Math.min(
    Math.max(parseInt(body.radius || settings.search.defaultRadius, 10), 500),   // min 500m
    50000  // max 50km
  );

  const limit = Math.min(Math.max(parseInt(body.limit || '10', 10), 1), 20);
  const page = Math.max(parseInt(body.page || '1', 10), 1);

  // ─── 4. Rate limiting ─────────────────────────────────────────────────────────
  const userId = user?._id?.toString() || 'anonymous';
  checkRateLimit(userId);

  // ─── 5. Grid key for caching (snap location to ~110m grid) ───────────────────
  let locationGrid = null;
  if (location) {
    const latGrid = Math.round(location.latitude  * 1000) / 1000;
    const lngGrid = Math.round(location.longitude * 1000) / 1000;
    locationGrid = `${latGrid}:${lngGrid}`;
  }

  return {
    query,
    location,
    locationGrid,
    userId,
    sessionId: body.sessionId || null,
    options: { radius, limit, page },
  };
}

/**
 * Simple in-memory rate limiter.
 * Each userId gets `maxPerUser` requests per `windowMs`.
 */
function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = settings.rateLimit.windowMs;
  const maxPerUser = settings.rateLimit.maxPerUser;

  const entry = _rateLimitStore.get(userId);

  if (!entry || now - entry.windowStart > windowMs) {
    // New window
    _rateLimitStore.set(userId, { count: 1, windowStart: now });
    return;
  }

  if (entry.count >= maxPerUser) {
    const err = new Error(`Rate limit exceeded. Maximum ${maxPerUser} searches per minute.`);
    err.statusCode = 429;
    throw err;
  }

  entry.count++;
}

// Clean up stale rate limit entries every 5 minutes to prevent memory leak
setInterval(() => {
  const cutoff = Date.now() - settings.rateLimit.windowMs * 2;
  for (const [key, entry] of _rateLimitStore) {
    if (entry.windowStart < cutoff) _rateLimitStore.delete(key);
  }
}, 300000);

module.exports = { ingestRequest };
