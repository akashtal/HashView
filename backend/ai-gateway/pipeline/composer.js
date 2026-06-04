/**
 * Pipeline Layer 6: Response Composer
 *
 * Formats the final response for the client:
 *  1. Cleans business objects (removes internal fields, strips PII)
 *  2. Generates the AI summary message
 *  3. Builds the structured response payload
 */

const { getRouter } = require('../providers/router');

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
 * @returns {Promise<Object>} - Final response payload
 */
async function composeResponse(rankedBusinesses, intent, query, totalCount, options, aiProvider, fallbackUsed, searchMeta = {}) {
  const { limit = 10, page = 1 } = options;
  const { searchAccuracy = 'exact', matchNote = null } = searchMeta;

  // ─── Clean businesses for client consumption ──────────────────────────────────
  const cleanedBusinesses = rankedBusinesses.map(cleanBusiness);

  // ─── Generate AI summary message ──────────────────────────────────────────────
  let message;
  try {
    const router = getRouter();
    message = await router.generateResponse({
      query,
      intent,
      businesses: cleanedBusinesses,
      resultCount: totalCount,
    });
  } catch {
    message = totalCount === 0
      ? `No results found for "${query}".`
      : `Found ${totalCount} business${totalCount !== 1 ? 'es' : ''} matching your search.`;
  }

  // ─── Pagination metadata ──────────────────────────────────────────────────────
  const totalPages = Math.ceil(totalCount / limit);

  // ─── Applied filters chips (for UI display) ───────────────────────────────────
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
    searchAccuracy,              // 'exact' | 'partial' | 'related' | 'none'
    matchNote,                   // Human-readable fuzzy-match note (null when exact)
    meta: {
      provider: aiProvider,
      fallbackUsed,
    },
  };
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

/**
 * Strip internal fields and PII from a business object before sending to client.
 */
function cleanBusiness(biz) {
  // Remove internal ranking/pipeline fields
  const {
    _distance,
    _score,
    _scoreBreakdown,
    _menuItems,
    _coupons,
    // Strip sensitive business fields
    documents,
    bankDetails,
    stripeCustomerId,
    stripeSubscriptionId,
    ...clean
  } = biz;

  return {
    ...clean,
    // Attach computed fields useful to client
    distanceKm: _distance ? Math.round(_distance / 100) / 10 : null, // e.g. 1230m → 1.2km
    relevanceScore: _score,
    matchingMenuItems: (_menuItems || []).slice(0, 3).map(item => ({
      _id:          item._id,
      name:         item.name,
      price:        item.price,
      currency:     item.currency || 'GBP',
      image:        item.image?.url || null,
      dietary:      item.dietary || [],
      menuCategory: item.menuCategory || null,
    })),
    hasActiveDeals: (_coupons || []).length > 0,
    activeDealsCount: (_coupons || []).length,
  };
}

/**
 * Build filter chips for the UI (e.g. "£15 max", "Halal", "Open now").
 */
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
  if (intent.min_rating) {
    filters.push({ type: 'rating', label: `${intent.min_rating}+ stars`, value: intent.min_rating });
  }
  if (intent.has_coupons) {
    filters.push({ type: 'deals', label: 'Has deals', value: true });
  }
  if (intent.is_open_now) {
    filters.push({ type: 'open', label: 'Open now', value: true });
  }
  if (intent.dietary) {
    intent.dietary.forEach(d => {
      filters.push({ type: 'dietary', label: capitalize(d), value: d });
    });
  }
  if (intent.city) {
    filters.push({ type: 'location', label: intent.city, value: intent.city });
  }

  return filters;
}

/**
 * Remove internal AI metadata before sending intent to client.
 */
function sanitizeIntentForClient(intent) {
  const { _meta, ...clean } = intent;
  return clean;
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { composeResponse };
