/**
 * AI Gateway — Search Route
 * POST /ai/search
 *
 * The main AI-powered search endpoint. Runs the full 7-layer pipeline:
 *   1. Ingestion    → validate, sanitize, rate limit
 *   2. Intent       → NL → structured filters (via AI provider)
 *   3. Query Build  → filters → MongoDB aggregation pipeline
 *   4. Retrieval    → execute query against MongoDB
 *   5. Ranking      → score + sort results by relevance
 *   6. Composition  → format response + generate AI message
 *   7. Delivery     → cache + log + return
 *
 * Request body:
 * {
 *   "query":     "chicken under £15 near me",   required
 *   "latitude":  51.5074,                        optional (enables geo features)
 *   "longitude": -0.1278,                        optional
 *   "radius":    10000,                          optional (metres, default 10km)
 *   "limit":     10,                             optional (max results, default 10)
 *   "page":      1,                              optional
 *   "sessionId": "abc123"                        optional (for analytics grouping)
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "message": "Found 4 restaurants near you with chicken under £15 🍗",
 *   "query": "chicken under £15 near me",
 *   "intent": { category: "restaurant", menu_keyword: "chicken", price_max: 15, ... },
 *   "appliedFilters": [{ type: "category", label: "Restaurant", value: "restaurant" }, ...],
 *   "businesses": [...],
 *   "pagination": { total: 4, page: 1, pages: 1, limit: 10, hasMore: false },
 *   "meta": { provider: "ollama", fallbackUsed: false }
 * }
 */

const express = require('express');
const router = express.Router();

// Pipeline layers
const { ingestRequest }   = require('../pipeline/ingestion');
const { parseIntent }     = require('../pipeline/intent_parser');
const { buildQuery }      = require('../pipeline/query_builder');
const { executeQuery }    = require('../pipeline/retriever');
const { rankResults }     = require('../pipeline/ranker');
const { composeResponse } = require('../pipeline/composer');
const { buildCacheKey, getCachedResponse, cacheResponse, logSearch } = require('../pipeline/delivery');

/**
 * POST /ai/search
 */
router.post('/', async (req, res) => {
  const requestStart = Date.now();
  let ingestedData = null;
  let intent = null;
  let intentMeta = {};

  try {
    // ─── Layer 1: Ingestion ───────────────────────────────────────────────────
    ingestedData = ingestRequest(req);
    const { query, location, locationGrid, userId, sessionId, options } = ingestedData;

    // ─── Layer 7 (early): Check cache ─────────────────────────────────────────
    // We pre-check cache with a query-only key before even calling the AI
    const roughCacheKey = `ai:search:rough:${query.toLowerCase()}:${locationGrid || 'noloc'}`;
    const cachedResponse = await getCachedResponse(roughCacheKey);
    if (cachedResponse) {
      // Log the cache hit and return immediately
      await logSearch({
        userId, sessionId, query,
        intent: cachedResponse.intent,
        provider: cachedResponse.meta?.provider,
        model: cachedResponse.meta?.model,
        resultCount: cachedResponse.pagination?.total || 0,
        resultBusinessIds: (cachedResponse.businesses || []).slice(0, 10).map(b => b._id),
        latency: { totalMs: Date.now() - requestStart },
        cached: true,
        location,
        locationGrid,
        fallbackUsed: cachedResponse.meta?.fallbackUsed || false,
      });
      return res.json(cachedResponse);
    }

    // ─── Layer 2: Intent Parsing ──────────────────────────────────────────────
    const intentStart = Date.now();
    const intentResult = await parseIntent(query);
    intent = intentResult.intent;
    intentMeta = {
      provider: intentResult.provider,
      model: intentResult.model,
      fallbackUsed: intentResult.fallbackUsed,
    };
    const intentMs = Date.now() - intentStart;

    // Handle off-topic queries
    if (intent.is_off_topic) {
      return res.json({
        success: true,
        message: "I can only help with finding local businesses. Try searching for restaurants, cafes, hotels, salons, and more!",
        query,
        intent,
        appliedFilters: [],
        businesses: [],
        pagination: { total: 0, page: 1, pages: 0, limit: options.limit, hasMore: false },
        meta: intentMeta,
      });
    }

    // ─── Layer 7 (mid): Check refined cache ───────────────────────────────────
    const refinedCacheKey = buildCacheKey(query, locationGrid, intent);
    const refinedCache = await getCachedResponse(refinedCacheKey);
    if (refinedCache) {
      await logSearch({
        userId, sessionId, query, intent,
        provider: refinedCache.meta?.provider,
        model: refinedCache.meta?.model,
        resultCount: refinedCache.pagination?.total || 0,
        resultBusinessIds: (refinedCache.businesses || []).slice(0, 10).map(b => b._id),
        latency: { intentMs, totalMs: Date.now() - requestStart },
        cached: true,
        location,
        locationGrid,
        fallbackUsed: refinedCache.meta?.fallbackUsed || false,
      });
      return res.json(refinedCache);
    }

    // ─── Layer 3: Query Builder ───────────────────────────────────────────────
    const pipeline = buildQuery(intent, location, options);

    // ─── Layer 4: Retrieval ───────────────────────────────────────────────────
    const queryStart = Date.now();
    const { businesses, totalCount, queryMs } = await executeQuery(pipeline);
    const dbMs = Date.now() - queryStart;

    // ─── Layer 5: Ranking ─────────────────────────────────────────────────────
    const rankStart = Date.now();
    const rankedBusinesses = rankResults(businesses, intent, location);
    const rankMs = Date.now() - rankStart;

    // ─── Layer 6: Composition ─────────────────────────────────────────────────
    const response = await composeResponse(
      rankedBusinesses,
      intent,
      query,
      totalCount,
      options,
      intentMeta.provider,
      intentMeta.fallbackUsed
    );

    const totalMs = Date.now() - requestStart;
    response.meta = { ...response.meta, model: intentMeta.model };

    // ─── Layer 7: Cache + Log + Return ────────────────────────────────────────
    // Fire cache + log async (don't block the response)
    setImmediate(async () => {
      await Promise.all([
        cacheResponse(refinedCacheKey, response),
        cacheResponse(roughCacheKey, response),
        logSearch({
          userId,
          sessionId,
          query,
          intent,
          provider: intentMeta.provider,
          model: intentMeta.model,
          resultCount: totalCount,
          resultBusinessIds: rankedBusinesses.slice(0, 10).map(b => b._id),
          latency: { intentMs, queryMs: dbMs, rankMs, totalMs },
          cached: false,
          location,
          locationGrid,
          fallbackUsed: intentMeta.fallbackUsed,
        }),
      ]);
    });

    return res.json(response);

  } catch (err) {
    // Log the failed search
    if (ingestedData) {
      setImmediate(() => logSearch({
        userId: ingestedData.userId,
        sessionId: ingestedData.sessionId,
        query: ingestedData.query,
        intent,
        provider: intentMeta.provider,
        fallbackUsed: intentMeta.fallbackUsed,
        latency: { totalMs: Date.now() - requestStart },
        error: err.message,
      }));
    }

    const statusCode = err.statusCode || 500;

    if (statusCode === 400 || statusCode === 429) {
      return res.status(statusCode).json({
        success: false,
        error: err.message,
      });
    }

    console.error('[AI Search] Unhandled error:', err);
    return res.status(500).json({
      success: false,
      error: 'AI search temporarily unavailable. Please try again.',
    });
  }
});

module.exports = router;
