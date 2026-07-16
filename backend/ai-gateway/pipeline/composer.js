/**
 * Pipeline Layer 6: Response Composer
 *
 * Formats the final response for the client:
 *  1. Deduplicates businesses by _id (safety net on top of query_builder dedup)
 *  2. Cleans business objects (removes internal fields, strips PII)
 *  3. Generates a DATABASE-FIRST summary message (template-based, no hallucination)
 *  4. Builds the structured response payload with confidence score and clarification hints
 *
 * Database-First Principle:
 *  The summary message is ALWAYS generated from actual data in the businesses array.
 *  It NEVER calls the LLM to generate the summary — that was the source of hallucination.
 *  The LLM is only called in the CHAT pipeline (chat_engine.js), not in search.
 */

/**
 * Layer 6: Compose the final API response.
 *
 * @param {Object[]} rankedBusinesses - Scored/sorted businesses from Layer 5
 * @param {Object}   intent           - Normalized intent from Layer 2
 * @param {string}   query            - Original user query
 * @param {number}   totalCount       - Total results count (before pagination)
 * @param {Object}   options          - { limit, page }
 * @param {string}   aiProvider       - Which provider was used (for transparency)
 * @param {boolean}  fallbackUsed     - Whether AI fallback was used
 * @param {Object}   searchMeta       - { searchAccuracy, matchNote }
 * @returns {Object} - Final response payload
 */
function composeResponse(rankedBusinesses, intent, query, totalCount, options, aiProvider, fallbackUsed, searchMeta = {}) {
  const { limit = 10, page = 1 } = options;
  const { searchAccuracy = 'exact', matchNote = null } = searchMeta;

  // ─── Safety deduplication (belt-and-suspenders on top of query_builder) ────────
  const seen = new Map();
  const dedupedBusinesses = [];
  for (const biz of rankedBusinesses) {
    const id = biz._id?.toString() || biz.id?.toString();
    if (id && !seen.has(id)) {
      seen.set(id, true);
      dedupedBusinesses.push(biz);
    }
  }

  // ─── Clean businesses for client consumption ──────────────────────────────────
  const cleanedBusinesses = dedupedBusinesses.map(cleanBusiness);

  // ─── Database-first summary message ───────────────────────────────────────────
  // Generated deterministically from actual data — zero chance of hallucination
  const message = buildDatabaseFirstMessage(cleanedBusinesses, intent, totalCount, searchAccuracy, query);

  // ─── Confidence score ─────────────────────────────────────────────────────────
  const confidenceScore = computeConfidenceScore(totalCount, searchAccuracy, cleanedBusinesses, intent);

  // ─── Clarification question ───────────────────────────────────────────────────
  const clarificationQuestion = confidenceScore === 'low'
    ? buildClarificationQuestion(intent, query)
    : null;

  // ─── Pagination metadata ──────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / limit);

  // ─── Applied filter chips (for UI) ───────────────────────────────────────────
  const appliedFilters = buildAppliedFilters(intent);

  return {
    success: true,
    message,
    query,
    intent: sanitizeIntentForClient(intent),
    appliedFilters,
    businesses: cleanedBusinesses,
    pagination: {
      total: totalCount,
      page,
      pages: totalPages,
      limit,
      hasMore: page < totalPages,
    },
    searchAccuracy,
    matchNote,
    confidenceScore,
    clarificationQuestion,
    meta: {
      provider: aiProvider,
      fallbackUsed,
    },
  };
}

// ─── Database-First Message Builder ──────────────────────────────────────────

/**
 * Generates a summary message ENTIRELY from actual data.
 * No LLM is called. Template-based with data injection.
 */
function buildDatabaseFirstMessage(businesses, intent, totalCount, searchAccuracy, query) {
  const categoryLabel = intent.category
    ? capitalize(intent.category) + (totalCount === 1 ? '' : 's')
    : 'business' + (totalCount === 1 ? '' : 'es');

  const itemLabel = intent.menu_keyword ? `"${intent.menu_keyword}"` : null;
  const locationLabel = intent.city ? `in ${intent.city}` : 'near you';
  const dietaryLabel = intent.dietary && intent.dietary.length > 0
    ? intent.dietary.map(capitalize).join(', ')
    : null;

  // ─── Zero results ──────────────────────────────────────────────────────────
  if (totalCount === 0) {
    let msg = `No ${categoryLabel} found`;
    if (itemLabel) msg += ` serving ${itemLabel}`;
    if (dietaryLabel) msg += ` (${dietaryLabel})`;
    msg += ` ${locationLabel}.`;

    if (searchAccuracy === 'related') {
      msg += ' Showing similar options below.';
    } else if (searchAccuracy === 'none') {
      msg += ' Try a different search term or expand your radius.';
    }
    return msg;
  }

  // ─── Found results ──────────────────────────────────────────────────────────
  let msg = `Found ${totalCount} ${categoryLabel}`;
  if (itemLabel) msg += ` serving ${itemLabel}`;
  if (dietaryLabel) msg += ` (${dietaryLabel})`;
  msg += ` ${locationLabel}`;

  // Sort context
  if (intent.sort_by === 'rating' || intent.min_rating) {
    msg += ', sorted by rating.';
  } else if (intent.sort_by === 'price_asc') {
    msg += ', sorted by price (low to high).';
  } else if (intent.sort_by === 'price_desc') {
    msg += ', sorted by price (high to low).';
  } else {
    msg += ', sorted by relevance.';
  }

  // Accuracy note
  if (searchAccuracy === 'partial') {
    msg += ' Some results may be approximate matches.';
  } else if (searchAccuracy === 'related') {
    msg += ' Showing related options — exact menu matches not found.';
  }

  // Top result callout (data-grounded)
  if (businesses.length > 0) {
    const top = businesses[0];
    const topRating = top.rating?.average;
    const topDistance = top.distanceKm;
    if (topRating >= 4.5 && top.rating?.count >= 10) {
      msg += ` Top result: ${top.name} (${topRating.toFixed(1)}★)`;
      if (topDistance !== null) msg += ` — ${topDistance < 1 ? Math.round(topDistance * 1000) + 'm' : topDistance + 'km'} away.`;
      else msg += '.';
    }
  }

  return msg;
}

// ─── Confidence Score ─────────────────────────────────────────────────────────

/**
 * Compute confidence level based on result quality.
 *
 * high   — exact match, 1+ results
 * medium — partial match or few results
 * low    — related/no match, zero results, or very poor quality
 */
function computeConfidenceScore(totalCount, searchAccuracy, businesses, intent) {
  if (totalCount === 0) return 'low';
  if (searchAccuracy === 'none' || searchAccuracy === 'related') return 'low';
  if (searchAccuracy === 'partial') return 'medium';

  // Check if top results actually have menu items when a menu keyword was used
  if (intent.menu_keyword) {
    const matchingCount = businesses.filter(b =>
      b.matchingMenuItems && b.matchingMenuItems.length > 0
    ).length;
    if (matchingCount === 0) return 'low';
    if (matchingCount < 2) return 'medium';
  }

  return 'high';
}

// ─── Clarification Question ────────────────────────────────────────────────────

function buildClarificationQuestion(intent, query) {
  if (!intent.menu_keyword) {
    return `I couldn't find what you're looking for. Could you be more specific? (e.g. "pizza near me", "halal restaurant", "cheap lunch")`;
  }

  const keyword = intent.menu_keyword;
  // Suggest related terms based on common confusions
  const suggestions = getSuggestions(keyword);
  if (suggestions.length > 0) {
    return `I couldn't find "${keyword}" nearby. Did you mean: ${suggestions.join(' or ')}?`;
  }

  return `I couldn't find "${keyword}" in my database. Try searching for a different dish or expand your area.`;
}

function getSuggestions(keyword) {
  const suggestionMap = {
    'noodles':  ['chow mein', 'fried noodles'],
    'rice':     ['fried rice', 'biryani', 'pilau'],
    'chicken':  ['chicken tikka', 'fried chicken', 'grilled chicken'],
    'fish':     ['fish and chips', 'grilled fish', 'fish curry'],
    'veg':      ['vegetarian', 'vegan', 'vegetable curry'],
    'meat':     ['chicken', 'lamb', 'beef'],
  };
  return suggestionMap[keyword.toLowerCase()] || [];
}

// ─── Business Cleaner ────────────────────────────────────────────────────────

/**
 * Strip internal fields and PII from a business object before sending to client.
 * Also passes through explainability reasons from the ranker.
 */
function cleanBusiness(biz) {
  const {
    _distance,
    _score,
    _scoreBreakdown,
    _menuItems,
    _coupons,
    _reasons,
    // Strip sensitive business fields
    documents,
    bankDetails,
    stripeCustomerId,
    stripeSubscriptionId,
    selfieUrl,
    selfiePublicId,
    claimRequest,
    importedBy,
    adminVerification,
    rejectionReason,
    verifiedBy,
    submittedForReviewAt,
    kycStatus,
    ...clean
  } = biz;

  return {
    ...clean,
    // Computed client fields
    distanceKm: _distance ? Math.round(_distance / 100) / 10 : null,
    relevanceScore: _score,
    reasons: _reasons || [],  // Explainability reasons for UI display
    matchingMenuItems: (_menuItems || []).slice(0, 4).map(item => ({
      _id:          item._id,
      name:         item.name,
      price:        item.price,
      currency:     item.currency || 'GBP',
      image:        item.image?.url || null,
      dietary:      item.dietary || [],
      menuCategory: item.menuCategory || null,
      description:  item.description || null,
    })),
    hasActiveDeals:   (_coupons || []).length > 0,
    activeDealsCount: (_coupons || []).length,
  };
}

// ─── Filter Chips Builder ─────────────────────────────────────────────────────

function buildAppliedFilters(intent) {
  const filters = [];

  if (intent.category) {
    filters.push({ type: 'category', label: capitalize(intent.category), value: intent.category });
  }
  if (intent.menu_keyword) {
    filters.push({ type: 'menu', label: capitalize(intent.menu_keyword), value: intent.menu_keyword });
  }
  if (intent.price_max) {
    filters.push({ type: 'price', label: `Under £${intent.price_max}`, value: intent.price_max });
  }
  if (intent.price_min) {
    filters.push({ type: 'price_min', label: `From £${intent.price_min}`, value: intent.price_min });
  }
  if (intent.budget_total) {
    filters.push({ type: 'budget', label: `Budget £${intent.budget_total}`, value: intent.budget_total });
  }
  if (intent.min_rating) {
    filters.push({ type: 'rating', label: `${intent.min_rating}★+`, value: intent.min_rating });
  }
  if (intent.has_coupons) {
    filters.push({ type: 'deals', label: '🎉 Has deals', value: true });
  }
  if (intent.is_open_now) {
    filters.push({ type: 'open', label: '🟢 Open now', value: true });
  }
  if (intent.dietary) {
    intent.dietary.forEach(d => {
      filters.push({ type: 'dietary', label: capitalize(d), value: d });
    });
  }
  if (intent.facility_filters) {
    intent.facility_filters.forEach(f => {
      const label = FACILITY_LABELS[f] || capitalize(f.replace('_', ' '));
      filters.push({ type: 'facility', label, value: f });
    });
  }
  if (intent.city) {
    filters.push({ type: 'location', label: intent.city, value: intent.city });
  }
  if (intent.meal_time) {
    filters.push({ type: 'meal_time', label: capitalize(intent.meal_time), value: intent.meal_time });
  }
  if (intent.distance_max) {
    filters.push({ type: 'distance', label: `Within ${intent.distance_max}km`, value: intent.distance_max });
  }

  return filters;
}

const FACILITY_LABELS = {
  parking:        '🅿️ Parking',
  wifi:           '📶 WiFi',
  outdoor_seating:'🌤 Outdoor seating',
  family_friendly:'👨‍👩‍👧 Family friendly',
  alcohol:        '🍷 Alcohol served',
  pet_friendly:   '🐕 Pet friendly',
  delivery:       '🛵 Delivery',
  takeaway:       '🥡 Takeaway',
  dine_in:        '🍽 Dine in',
  wheelchair:     '♿ Wheelchair access',
  reservation:    '📅 Reservations',
  private_dining: '🔒 Private dining',
};

function sanitizeIntentForClient(intent) {
  const { _meta, ...clean } = intent;
  return clean;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { composeResponse };
