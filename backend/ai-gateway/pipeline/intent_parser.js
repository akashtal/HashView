/**
 * Pipeline Layer 2: Intent Parser
 *
 * Converts a natural language query into structured search filters using the
 * active AI provider. If the AI fails, falls back to the mock (regex) adapter.
 *
 * Output shape:
 * {
 *   category: "restaurant" | null,
 *   menu_keyword: "chicken noodles" | null,      // Corrected full phrase
 *   menu_keywords: ["chicken", "noodles"] | null, // Individual words for fuzzy matching
 *   meal_time: "breakfast" | "lunch" | "dinner" | null,
 *   corrected_query: "chicken noodles" | null,   // Set when spelling was corrected
 *   price_max: 15 | null,
 *   price_min: null,
 *   near_me: true,
 *   city: null,
 *   area: null,
 *   min_rating: 4 | null,
 *   sort_by: "distance" | "rating" | "price_asc" | "price_desc",
 *   has_coupons: false,
 *   is_open_now: false,
 *   dietary: ["halal"] | null,
 *   is_off_topic: false,
 * }
 */

const { getRouter } = require('../providers/router');

/**
 * Layer 2: Parse natural language intent.
 *
 * @param {string} query - Sanitized user query from Layer 1
 * @returns {Promise<{ intent, provider, model, fallbackUsed }>}
 */
async function parseIntent(query) {
  const router = getRouter();
  const result = await router.extractIntent(query);

  // Post-validation: ensure intent has all required fields with correct types
  const intent = normalizeIntent(result.intent);

  return {
    intent,
    provider: result.provider,
    model: result.model,
    fallbackUsed: result.fallbackUsed,
  };
}

/**
 * Normalize and validate an intent object to ensure it has all required fields
 * with correct types, regardless of what the AI returned.
 */
function normalizeIntent(raw = {}) {
  // Normalize meal_time
  const VALID_MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];
  const rawMealTime = typeof raw.meal_time === 'string' ? raw.meal_time.toLowerCase() : null;
  const meal_time = VALID_MEAL_TIMES.includes(rawMealTime) ? rawMealTime : null;

  // Normalize menu_keyword — lowercase, trim
  const menu_keyword = typeof raw.menu_keyword === 'string' && raw.menu_keyword.trim()
    ? raw.menu_keyword.toLowerCase().trim()
    : null;

  // Normalize menu_keywords — filter to non-empty strings, deduplicate
  let menu_keywords = null;
  if (Array.isArray(raw.menu_keywords) && raw.menu_keywords.length > 0) {
    const cleaned = raw.menu_keywords
      .filter(k => typeof k === 'string' && k.trim().length > 1)
      .map(k => k.toLowerCase().trim());
    if (cleaned.length > 1) {
      menu_keywords = [...new Set(cleaned)]; // deduplicate
    }
    // If only 1 keyword, treat as null (same as menu_keyword — no need for split search)
  }

  // If menu_keyword is multi-word but menu_keywords wasn't set, auto-split it
  if (menu_keyword && !menu_keywords) {
    const words = menu_keyword.split(/\s+/).filter(w => w.length > 1);
    if (words.length > 1) {
      menu_keywords = words;
    }
  }

  // Corrected query — only set if it differs meaningfully from original
  const corrected_query = typeof raw.corrected_query === 'string' && raw.corrected_query.trim()
    ? raw.corrected_query.toLowerCase().trim()
    : null;

  return {
    category:        typeof raw.category === 'string'     ? raw.category.toLowerCase() : null,
    menu_keyword,
    menu_keywords,
    meal_time,
    corrected_query,
    price_max:       (typeof raw.price_max === 'number' && raw.price_max > 0) ? raw.price_max : null,
    price_min:       (typeof raw.price_min === 'number' && raw.price_min > 0) ? raw.price_min : null,
    near_me:         raw.near_me !== false,    // Default true
    city:            typeof raw.city === 'string'         ? raw.city : null,
    area:            typeof raw.area === 'string'         ? raw.area : null,
    min_rating:      (typeof raw.min_rating === 'number' && raw.min_rating >= 1 && raw.min_rating <= 5) ? raw.min_rating : null,
    sort_by:         ['distance', 'rating', 'price_asc', 'price_desc', 'newest'].includes(raw.sort_by) ? raw.sort_by : 'distance',
    has_coupons:     raw.has_coupons === true,
    is_open_now:     raw.is_open_now === true,
    dietary:         Array.isArray(raw.dietary) && raw.dietary.length > 0 ? raw.dietary : null,
    is_off_topic:    raw.is_off_topic === true,
  };
}

module.exports = { parseIntent, normalizeIntent };
