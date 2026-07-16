/**
 * Pipeline Layer 5: Relevance Ranker
 *
 * Re-scores and sorts the retrieved businesses using the weighted multi-factor
 * scoring algorithm.
 *
 * The scoring formula:
 *
 * relevance_score = (
 *     w1 × distance_score        (closer = better, exponential decay)
 *     w2 × rating_score          (higher rating = better)
 *     w3 × menu_match_score      (menu keyword/price match quality)
 *     w4 × recency_score         (recent reviews = more active business)
 *     w5 × popularity_score      (review count + visit count)
 *     w6 × coupon_bonus          (has active deals)
 *     w7 × verification_bonus    (verified/claimed businesses)
 *     w8 × dietary_match_score   (all requested dietary filters satisfied)
 *     w9 × completeness_score    (business profile completeness)
 * )
 *
 * Explainability:
 *   Each business receives a _reasons[] array with human-readable strings
 *   that explain WHY it was recommended (for both UI display and AI context).
 */

const settings = require('../config/settings');

const MAX_RADIUS_KM = 10;      // Distance score → 0 at this distance
const DAYS_RECENCY_WINDOW = 90; // Recency score → 0 after 90 days

/**
 * Layer 5: Score and sort businesses by relevance.
 *
 * @param {Object[]} businesses - Raw businesses from Layer 4
 * @param {Object}   intent     - Normalized intent from Layer 2
 * @param {Object}   location   - { latitude, longitude } or null
 * @returns {Object[]} - Businesses sorted by relevance score (highest first)
 */
function rankResults(businesses, intent, location) {
  const w = {
    distance:     parseFloat(process.env.AI_WEIGHT_DISTANCE     || '0.25'),
    rating:       parseFloat(process.env.AI_WEIGHT_RATING       || '0.22'),
    menuMatch:    parseFloat(process.env.AI_WEIGHT_MENU_MATCH   || '0.20'),
    recency:      parseFloat(process.env.AI_WEIGHT_RECENCY      || '0.08'),
    popularity:   parseFloat(process.env.AI_WEIGHT_POPULARITY   || '0.07'),
    couponBonus:  parseFloat(process.env.AI_WEIGHT_COUPON       || '0.05'),
    verification: parseFloat(process.env.AI_WEIGHT_VERIFICATION || '0.05'),
    dietary:      parseFloat(process.env.AI_WEIGHT_DIETARY      || '0.05'),
    completeness: parseFloat(process.env.AI_WEIGHT_COMPLETENESS || '0.03'),
  };

  const scored = businesses.map(biz => {
    // ─── Individual Scores (each 0.0 to 1.0) ─────────────────────────────────
    const distanceKm = (biz._distance || 0) / 1000;
    const distanceScore = location
      ? Math.max(0, 1 - distanceKm / MAX_RADIUS_KM)
      : 0.5;

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
    const popularityScore = Math.min(1, (reviewCount / 100 + visitCount / 500) / 2);

    const couponBonus = (biz._coupons && biz._coupons.length > 0) ? 1.0 : 0.0;

    const verificationBonus = (biz.isVerified || biz.isActive) ? 1.0 : 0.0;

    // ─── Dietary Match Score (NEW) ────────────────────────────────────────────
    // 1.0 if all requested dietary filters are satisfied by at least one menu item
    const dietaryMatchScore = computeDietaryMatchScore(biz._menuItems, intent.dietary);

    // ─── Completeness Score (NEW) ─────────────────────────────────────────────
    // Based on how complete the business profile is
    const completenessScore = computeCompletenessScore(biz);

    // ─── Weighted Score ───────────────────────────────────────────────────────
    const relevanceScore =
      w.distance     * distanceScore      +
      w.rating       * ratingScore        +
      w.menuMatch    * menuMatchScore      +
      w.recency      * recencyScore        +
      w.popularity   * popularityScore    +
      w.couponBonus  * couponBonus         +
      w.verification * verificationBonus  +
      w.dietary      * dietaryMatchScore  +
      w.completeness * completenessScore;

    // ─── Explainability Reasons (NEW) ────────────────────────────────────────
    const reasons = buildReasons(biz, intent, {
      distanceKm,
      rating,
      reviewCount,
      menuMatchScore,
      dietaryMatchScore,
      couponBonus,
      verificationBonus,
    });

    return {
      ...biz,
      _score: Math.round(relevanceScore * 1000) / 1000,
      _scoreBreakdown: {
        distance:     Math.round(distanceScore     * w.distance     * 1000) / 1000,
        rating:       Math.round(ratingScore       * w.rating       * 1000) / 1000,
        menuMatch:    Math.round(menuMatchScore     * w.menuMatch    * 1000) / 1000,
        recency:      Math.round(recencyScore       * w.recency      * 1000) / 1000,
        popularity:   Math.round(popularityScore    * w.popularity   * 1000) / 1000,
        couponBonus:  Math.round(couponBonus        * w.couponBonus  * 1000) / 1000,
        verification: Math.round(verificationBonus  * w.verification * 1000) / 1000,
        dietary:      Math.round(dietaryMatchScore  * w.dietary      * 1000) / 1000,
        completeness: Math.round(completenessScore  * w.completeness * 1000) / 1000,
      },
      _reasons: reasons,
    };
  });

  // Apply intent-aware sort override
  if (intent.sort_by === 'rating') {
    scored.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
  } else if (intent.sort_by === 'price_asc') {
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

// ─── Menu Match Score ─────────────────────────────────────────────────────────

/**
 * Score how well the business's menu items match the intent.
 *
 * 1.0 = exact full phrase match in item name
 * 0.9 = phrase contained in name
 * 0.8 = all individual keywords match (partial match)
 * 0.7 = tag match
 * 0.5 = any individual keyword matches
 * 0.4 = description match
 * 0.3 = has menu items (but no specific match required)
 * 0.0 = no match or no menu filter
 */
function computeMenuMatchScore(menuItems, intent) {
  if (!intent.menu_keyword || !menuItems || menuItems.length === 0) {
    return menuItems && menuItems.length > 0 ? 0.3 : 0.0;
  }

  const keyword  = intent.menu_keyword.toLowerCase();
  const keywords = intent.menu_keywords || null;
  let bestScore  = 0;

  for (const item of menuItems) {
    const itemName = (item.name || '').toLowerCase();
    const itemTags = (item.tags || []).map(t => t.toLowerCase());
    const itemDesc = (item.description || '').toLowerCase();

    // Level 1: Exact full phrase
    if (itemName === keyword) { bestScore = 1.0; break; }
    if (itemName.includes(keyword)) { bestScore = Math.max(bestScore, 0.9); continue; }

    // Level 2: All individual keywords present
    if (keywords && keywords.length > 1) {
      const allWordsMatch = keywords.every(kw =>
        itemName.includes(kw) || itemDesc.includes(kw) || itemTags.some(t => t.includes(kw))
      );
      if (allWordsMatch) { bestScore = Math.max(bestScore, 0.8); continue; }

      const anyWordMatch = keywords.some(kw =>
        itemName.includes(kw) || itemTags.some(t => t.includes(kw))
      );
      if (anyWordMatch) { bestScore = Math.max(bestScore, 0.5); continue; }
    }

    // Level 3: Tag matches
    if (itemTags.some(t => t === keyword)) { bestScore = Math.max(bestScore, 0.7); continue; }
    if (itemTags.some(t => t.includes(keyword))) { bestScore = Math.max(bestScore, 0.6); continue; }

    // Level 4: Description match
    if (itemDesc.includes(keyword)) { bestScore = Math.max(bestScore, 0.4); }
  }

  return bestScore;
}

// ─── Dietary Match Score (NEW) ────────────────────────────────────────────────

/**
 * Score how well the business satisfies dietary requirements.
 *
 * 1.0 = all requested dietary filters are present in at least one menu item
 * 0.5 = some (not all) dietary filters satisfied
 * 0.0 = no dietary filter requested OR no menu items satisfy any
 */
function computeDietaryMatchScore(menuItems, dietary) {
  if (!dietary || dietary.length === 0) return 0.0;
  if (!menuItems || menuItems.length === 0) return 0.0;

  const allItemsDietary = new Set();
  for (const item of menuItems) {
    for (const d of (item.dietary || [])) {
      allItemsDietary.add(d.toLowerCase());
    }
  }

  const matchedCount = dietary.filter(d => allItemsDietary.has(d.toLowerCase())).length;
  if (matchedCount === 0) return 0.0;
  return matchedCount / dietary.length;
}

// ─── Completeness Score (NEW) ─────────────────────────────────────────────────

/**
 * Score based on how complete the business profile is.
 * Rewards businesses that have filled in their profile — they tend to be
 * more engaged and provide better information to users.
 */
function computeCompletenessScore(biz) {
  let score = 0;
  let maxScore = 0;

  const checks = [
    [biz.description && biz.description.length > 20, 2],   // Has a real description
    [biz.logo?.url, 2],                                      // Has a logo
    [biz.coverImage?.url, 2],                                // Has a cover image
    [biz.openingHours && Object.keys(biz.openingHours).length > 0, 2], // Has opening hours
    [biz.rating?.count > 0, 1],                              // Has reviews
    [biz.isVerified, 1],                                     // Verified
    [biz.menuItemCount > 0, 2],                              // Has menu items
  ];

  for (const [condition, weight] of checks) {
    maxScore += weight;
    if (condition) score += weight;
  }

  return maxScore > 0 ? score / maxScore : 0;
}

// ─── Explainability Reasons (NEW) ────────────────────────────────────────────

/**
 * Build a human-readable list of reasons explaining why this business was recommended.
 * These are shown in the UI under each card and injected into the AI chat context.
 *
 * @returns {string[]} Array of reason strings (checkmark prefix for positive, cross for negative)
 */
function buildReasons(biz, intent, scores) {
  const reasons = [];

  // ─── Matching Dishes ──────────────────────────────────────────────────────
  if (intent.menu_keyword && biz._menuItems && biz._menuItems.length > 0) {
    const topItem = biz._menuItems[0];
    const price = topItem.price > 0 ? ` — £${topItem.price.toFixed(2)}` : '';
    reasons.push(`✓ ${topItem.name}${price} available`);

    if (biz._menuItems.length > 1) {
      const additionalItems = biz._menuItems.slice(1, 3).map(i => i.name).join(', ');
      reasons.push(`✓ Also: ${additionalItems}`);
    }
  } else if (intent.menu_keyword) {
    reasons.push(`✗ No menu information available for "${intent.menu_keyword}"`);
  }

  // ─── Rating ───────────────────────────────────────────────────────────────
  if (scores.rating > 0) {
    const reviewText = scores.reviewCount > 0 ? ` (${scores.reviewCount} reviews)` : '';
    reasons.push(`✓ ${scores.rating.toFixed(1)}★${reviewText}`);
  } else {
    reasons.push(`✗ No rating available`);
  }

  // ─── Distance ─────────────────────────────────────────────────────────────
  if (scores.distanceKm > 0) {
    const distText = scores.distanceKm < 1
      ? `${Math.round(scores.distanceKm * 1000)}m away`
      : `${scores.distanceKm.toFixed(1)}km away`;
    reasons.push(`✓ ${distText}`);
  }

  // ─── Dietary ──────────────────────────────────────────────────────────────
  if (intent.dietary && intent.dietary.length > 0) {
    if (scores.dietaryMatchScore >= 1.0) {
      reasons.push(`✓ ${intent.dietary.map(d => capitalize(d)).join(', ')} certified`);
    } else if (scores.dietaryMatchScore > 0) {
      const partial = intent.dietary.length > 1
        ? 'Partial dietary match'
        : `${capitalize(intent.dietary[0])} options available`;
      reasons.push(`✓ ${partial}`);
    } else {
      reasons.push(`✗ ${intent.dietary.map(d => capitalize(d)).join(', ')} not confirmed on menu`);
    }
  }

  // ─── Deals ────────────────────────────────────────────────────────────────
  if (biz._coupons && biz._coupons.length > 0) {
    reasons.push(`✓ ${biz._coupons.length} active deal${biz._coupons.length > 1 ? 's' : ''}`);
  }

  // ─── Verified ─────────────────────────────────────────────────────────────
  if (biz.isVerified) {
    reasons.push(`✓ Verified business`);
  }

  // ─── Price Info ───────────────────────────────────────────────────────────
  const menuPrices = (biz._menuItems || []).map(i => i.price).filter(p => p > 0);
  if (menuPrices.length > 0) {
    const minPrice = Math.min(...menuPrices);
    const maxPrice = Math.max(...menuPrices);
    if (minPrice === maxPrice) {
      reasons.push(`✓ Items from £${minPrice.toFixed(2)}`);
    } else {
      reasons.push(`✓ Items from £${minPrice.toFixed(2)} – £${maxPrice.toFixed(2)}`);
    }
  } else if (intent.menu_keyword) {
    reasons.push(`✗ Price data unavailable`);
  }

  return reasons;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { rankResults };
