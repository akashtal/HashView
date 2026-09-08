/**
 * Pipeline Layer 7: Delivery
 *
 * Final layer — handles:
 *  1. Redis caching: store response, serve cache hits
 *  2. Search logging: write SearchLog record for analytics
 *  3. Return structured response to client
 *
 * Cache key strategy:
 *   hash(query_normalized + location_grid + intent_hash) → 5min TTL
 *
 * The cache key includes intent_hash so that two queries that map to the same
 * intent (e.g. "halal food" and "halal restaurant") share a cache entry.
 */

const settings = require('../config/settings');

// Lazy-load to avoid circular deps
let _redisHelpers = null;
let SearchLog = null;

function getRedisHelpers() {
  if (!_redisHelpers) {
    try {
      // Use the existing Redis helpers from server config
      _redisHelpers = require('../../config/redis');
    } catch {
      _redisHelpers = null;
    }
  }
  return _redisHelpers;
}

function getSearchLog() {
  if (!SearchLog) {
    SearchLog = require('../../models/SearchLog.model');
  }
  return SearchLog;
}

// ─── Cache Key Builder ────────────────────────────────────────────────────────

/**
 * Build a stable cache key from query + location grid.
 * We normalize the query (lowercase, trim) to increase cache hit rate.
 */
function buildCacheKey(query, locationGrid, intent) {
  const normalizedQuery = (query || '').toLowerCase().trim().replace(/\s+/g, ' ');

  // Include ALL intent fields that affect results (v4: added menu_category, meal_time, budget_total)
  const intentKey = [
    intent?.category || '',
    intent?.menu_keyword || '',
    intent?.menu_category || '',      // v4: starters/mains/desserts/kids/sharing
    intent?.meal_time || '',          // v4: breakfast/lunch/dinner
    intent?.price_max || '',
    intent?.budget_total || '',       // v4: 3-course budget
    intent?.sort_by || '',
    intent?.has_coupons ? '1' : '0',
    intent?.is_open_now ? '1' : '0',
    intent?.city || '',
    (intent?.dietary || []).join(','),
  ].join(':');

  return `ai:search:v4:${normalizedQuery}:${locationGrid || 'noloc'}:${intentKey}`;
}

// ─── Main Layer Functions ─────────────────────────────────────────────────────

/**
 * Check cache BEFORE running the search pipeline.
 * Returns cached response if available, null otherwise.
 */
async function getCachedResponse(cacheKey) {
  if (!settings.search.cacheEnabled) return null;

  const redis = getRedisHelpers();
  if (!redis) return null;

  try {
    const cached = await redis.getCache(cacheKey);
    if (cached) {
      cached.meta = { ...cached.meta, cached: true };
      return cached;
    }
  } catch (err) {
    console.warn('[AI Delivery] Redis get failed:', err.message);
  }

  return null;
}

/**
 * Store response in Redis cache after successful search.
 */
async function cacheResponse(cacheKey, response) {
  if (!settings.search.cacheEnabled) return;

  const redis = getRedisHelpers();
  if (!redis) return;

  try {
    await redis.setCache(cacheKey, response, settings.search.cacheTtlSeconds);
  } catch (err) {
    console.warn('[AI Delivery] Redis set failed:', err.message);
  }
}

/**
 * Write a SearchLog record for analytics and future ranking improvement.
 */
async function logSearch({
  userId, sessionId, query, intent, provider, model,
  resultCount, resultBusinessIds, latency, cached, location, locationGrid,
  fallbackUsed, error,
}) {
  if (!settings.logSearches) return;

  try {
    const Model = getSearchLog();
    await Model.create({
      user: userId && userId !== 'anonymous' ? userId : undefined,
      sessionId,
      query,
      intent: intent ? sanitizeIntentForLog(intent) : undefined,
      provider,
      model,
      fallbackUsed: fallbackUsed || false,
      resultCount: resultCount || 0,
      resultBusinessIds: resultBusinessIds || [],
      cached: cached || false,
      location: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      } : undefined,
      locationGrid,
      latency,
      error,
    });
  } catch (err) {
    // Never let logging failures break the search response
    console.warn('[AI Delivery] SearchLog write failed:', err.message);
  }
}

function sanitizeIntentForLog(intent) {
  const { _meta, query_text, ...clean } = intent;
  return clean;
}

module.exports = { buildCacheKey, getCachedResponse, cacheResponse, logSearch };
