/**
 * Pipeline Layer 5: Relevance Ranker
 *
 * Re-scores and sorts the retrieved businesses using the weighted multi-factor
 * scoring algorithm defined in the AI Master Strategy.
 *
 * The scoring formula:
 *
 * relevance_score = (
 *     w1 × distance_score    +   (closer = better, exponential decay)
 *     w2 × rating_score      +   (higher rating = better)
 *     w3 × menu_match_score  +   (menu keyword/price match quality)
 *     w4 × recency_score     +   (recent reviews = more active business)
 *     w5 × popularity_score  +   (review count + visit count)
 *     w6 × coupon_bonus      +   (has active deals)
 *     w7 × verification_bonus    (verified/claimed businesses)
 * )
 *
 * All weights are tunable via .env — no code changes needed.
 * maxRadius controls the distance_score decay — default 10km.
 */

const settings = require('../config/settings');

const MAX_RADIUS_KM = 10; // Distance score reaches 0 at this distance (km)
const DAYS_RECENCY_WINDOW = 90; // Recency score reaches 0 after 90 days

/**
 * Layer 5: Score and sort businesses by relevance.
 *
 * @param {Object[]} businesses - Raw businesses from Layer 4
 * @param {Object}   intent     - Normalized intent from Layer 2
 * @param {Object}   location   - { latitude, longitude } or null
 * @returns {Object[]} - Businesses sorted by relevance score (highest first)
 */
function rankResults(businesses, intent, location) {
  const w = settings.search.weights;

  const scored = businesses.map(biz => {
    // ─── Individual Scores (each 0.0 to 1.0) ─────────────────────────────────
    const distanceKm = (biz._distance || 0) / 1000;
    const distanceScore = location
      ? Math.max(0, 1 - distanceKm / MAX_RADIUS_KM)
      : 0.5; // No location = neutral distance score

    const rating = biz.rating?.average || 0;
    const ratingScore = rating / 5.0;

    const menuMatchScore = computeMenuMatchScore(biz._menuItems, intent);

    const rawDate = biz.lastReviewAt?.$date || biz.lastReviewAt;
    const lastReviewDate = rawDate ? new Date(rawDate) : null;
    const daysSinceReview = (lastReviewDate && !isNaN(lastReviewDate.getTime()))
      ? Math.max(0, (Date.now() - lastReviewDate.getTime()) / (1000 * 60 * 60 * 24))
      : DAYS_RECENCY_WINDOW;
    const recencyScore = Math.max(0, 1 - daysSinceReview / DAYS_RECENCY_WINDOW);

    const reviewCount = biz.rating?.count || 0;
    const visitCount = biz.visitCount || 0;
    // Normalized popularity: sigmoid-like, maxes out at ~100 reviews or ~500 visits
    const popularityScore = Math.min(1, (reviewCount / 100 + visitCount / 500) / 2);

    const couponBonus = (biz._coupons && biz._coupons.length > 0) ? 1.0 : 0.0;

    const verificationBonus = (biz.isVerified || biz.isActive) ? 1.0 : 0.0;

    // ─── Weighted Score ───────────────────────────────────────────────────────
    const relevanceScore =
      w.distance     * distanceScore    +
      w.rating       * ratingScore      +
      w.menuMatch    * menuMatchScore   +
      w.recency      * recencyScore     +
      w.popularity   * popularityScore  +
      w.couponBonus  * couponBonus      +
      w.verification * verificationBonus;

    return {
      ...biz,
      _score: Math.round(relevanceScore * 1000) / 1000,  // 3 decimal places
      _scoreBreakdown: {
        distance:     Math.round(distanceScore     * w.distance     * 1000) / 1000,
        rating:       Math.round(ratingScore       * w.rating       * 1000) / 1000,
        menuMatch:    Math.round(menuMatchScore     * w.menuMatch    * 1000) / 1000,
        recency:      Math.round(recencyScore       * w.recency      * 1000) / 1000,
        popularity:   Math.round(popularityScore    * w.popularity   * 1000) / 1000,
        couponBonus:  Math.round(couponBonus        * w.couponBonus  * 1000) / 1000,
        verification: Math.round(verificationBonus  * w.verification * 1000) / 1000,
      },
    };
  });

  // Apply intent-aware sort override
  if (intent.sort_by === 'rating') {
    scored.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
  } else if (intent.sort_by === 'price_asc') {
    // Sort by cheapest matching menu item
    scored.sort((a, b) => {
      const aMin = Math.min(...(a._menuItems || []).map(m => m.price).filter(Boolean), Infinity);
      const bMin = Math.min(...(b._menuItems || []).map(m => m.price).filter(Boolean), Infinity);
      return aMin - bMin;
    });
  } else if (intent.sort_by === 'price_desc') {
    scored.sort((a, b) => {
      const aMax = Math.max(...(a._menuItems || []).map(m => m.price).filter(Boolean), -Infinity);
      const bMax = Math.max(...(b._menuItems || []).map(m => m.price).filter(Boolean), -Infinity);
      return bMax - aMax;
    });
  } else {
    // Default: sort by composite relevance score
    scored.sort((a, b) => b._score - a._score);
  }

  return scored;
}

/**
 * Score how well the business's menu items match the intent.
 *
 * 1.0 = exact name match
 * 0.7 = tag match
 * 0.4 = description match
 * 0.0 = no match (or no menu filter)
 */
function computeMenuMatchScore(menuItems, intent) {
  if (!intent.menu_keyword || !menuItems || menuItems.length === 0) {
    return menuItems && menuItems.length > 0 ? 0.3 : 0.0; // Having any menu = small bonus
  }

  const keyword = intent.menu_keyword.toLowerCase();
  let bestScore = 0;

  for (const item of menuItems) {
    const itemName = (item.name || '').toLowerCase();
    const itemTags = (item.tags || []).map(t => t.toLowerCase());
    const itemDesc = (item.description || '').toLowerCase();

    if (itemName === keyword) { bestScore = 1.0; break; }
    if (itemName.includes(keyword)) { bestScore = Math.max(bestScore, 0.9); continue; }
    if (itemTags.some(t => t === keyword)) { bestScore = Math.max(bestScore, 0.7); continue; }
    if (itemTags.some(t => t.includes(keyword))) { bestScore = Math.max(bestScore, 0.6); continue; }
    if (itemDesc.includes(keyword)) { bestScore = Math.max(bestScore, 0.4); }
  }

  return bestScore;
}

module.exports = { rankResults };
