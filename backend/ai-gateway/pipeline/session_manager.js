/**
 * AI Chat Session Manager
 *
 * Stores conversation state in Redis with a 60-minute TTL.
 * Each session tracks:
 *  - Full message history (user + assistant turns)
 *  - Which business the conversation is currently focused on
 *  - The FULL ranked business list with ordinal positions (1=first, 2=second, etc.)
 *  - The last search query and extracted intent
 *  - Cumulative filters (so "show only halal" refines previous results, not restarts)
 *  - Comparison targets (for "compare first and third" multi-turn flows)
 *  - User location (for location-aware answers)
 *
 * Key format:  ai:chat:{sessionId}
 * TTL:         60 minutes (extended from 30 to support longer shopping sessions)
 *
 * Ordinal Resolution:
 *   When user says "tell me about the second one", call resolveOrdinal(session, "second")
 *   to get the full business object at that position from rankedBusinessList.
 *
 * Comparison Resolution:
 *   When user says "compare first and third", call resolveComparison(session, "first", "third")
 *   to get both business objects from rankedBusinessList.
 */

const SESSION_TTL = 3600; // 60 minutes in seconds (was 30)
const MAX_HISTORY = 24;   // Keep last 24 messages (12 turns) — increased from 20
const KEY_PREFIX  = 'ai:chat:';

// Ordinal word → 0-based index (word-form and numeric-form)
const ORDINAL_TO_INDEX = {
  // Word forms
  first: 0, second: 1, third: 2, fourth: 3, fifth: 4,
  sixth: 5, seventh: 6, eighth: 7, ninth: 8, tenth: 9,
  last: -1, // special case: use rankedBusinessList.length - 1
  // Numeric forms ("1st", "2nd", "3rd", "4th"...)
  '1st': 0, '2nd': 1, '3rd': 2, '4th': 3, '5th': 4,
  '6th': 5, '7th': 6, '8th': 7, '9th': 8, '10th': 9,
  // Digit-only ("show me #2", "the 2")
  '1': 0, '2': 1, '3': 2, '4': 3, '5': 4,
  '6': 5, '7': 6, '8': 7, '9': 8, '10': 9,
};

// ─── Redis helpers ─────────────────────────────────────────────────────────────

/**
 * Load a session from Redis.
 * Returns null if session does not exist or Redis is unavailable.
 */
async function getSession(sessionId) {
  if (!sessionId) return null;
  try {
    const { getCache } = require('../../config/redis');
    const data = await getCache(`${KEY_PREFIX}${sessionId}`);
    return data || null;
  } catch (err) {
    console.warn('[Chat Session] getSession failed:', err.message);
    return null;
  }
}

/**
 * Save (create or update) a session.
 * Resets the TTL on every update to keep active sessions alive.
 */
async function saveSession(sessionId, session) {
  if (!sessionId) return;
  try {
    const { setCache } = require('../../config/redis');
    await setCache(`${KEY_PREFIX}${sessionId}`, session, SESSION_TTL);
  } catch (err) {
    console.warn('[Chat Session] saveSession failed:', err.message);
  }
}

/**
 * Delete a session (e.g., user clears chat).
 */
async function deleteSession(sessionId) {
  if (!sessionId) return;
  try {
    const { deleteCache } = require('../../config/redis');
    await deleteCache(`${KEY_PREFIX}${sessionId}`);
  } catch (err) {
    console.warn('[Chat Session] deleteSession failed:', err.message);
  }
}

// ─── Session Factory ───────────────────────────────────────────────────────────

/**
 * Create a new empty session.
 */
function createSession(options = {}) {
  return {
    userId:               options.userId || null,

    // Message history
    messages:             [],

    // Current business focus
    focusedBusinessId:    null,   // Business currently being discussed
    focusedBusinessName:  null,

    // Full ranked list with positions (NEW)
    // Shape: [{ position: 1, _id, name, category, rating, distanceKm, matchingMenuItems, reasons }, ...]
    rankedBusinessList:   [],

    // Legacy: just IDs (kept for backwards compat)
    lastSearchBusinessIds: [],

    // Search context
    lastSearchQuery:      null,   // The original search query
    lastSearchIntent:     null,   // Extracted intent from last search

    // Cumulative filters (NEW)
    // Merged intent across turns so "show only halal" refines previous results
    cumulativeIntent:     null,

    // Comparison state (NEW)
    comparisonTargets:    [],     // ['first', 'third'] → resolved to business IDs
    isInComparisonMode:   false,

    // Location
    location:             options.location || null,

    // Timestamps
    createdAt:            Date.now(),
    updatedAt:            Date.now(),
  };
}

// ─── Message Management ────────────────────────────────────────────────────────

/**
 * Append a message to a session and prune if over the limit.
 * Always keeps at least the first message (establishes initial context).
 */
function appendMessage(session, role, content, meta = {}) {
  session.messages.push({
    role,       // 'user' | 'assistant'
    content,
    timestamp:  Date.now(),
    ...meta,
  });

  // Trim oldest messages if over limit (keep index 0 for initial context)
  if (session.messages.length > MAX_HISTORY) {
    session.messages = [
      session.messages[0],
      ...session.messages.slice(-(MAX_HISTORY - 1)),
    ];
  }

  session.updatedAt = Date.now();
  return session;
}

/**
 * Get the last N messages formatted for the LLM.
 * Returns an array of { role, content } objects.
 */
function getRecentHistory(session, limit = 12) {
  return session.messages
    .slice(-limit)
    .map(msg => ({ role: msg.role, content: msg.content }));
}

// ─── Business Focus ────────────────────────────────────────────────────────────

/**
 * Update session focus to a specific business.
 */
function focusBusiness(session, businessId, businessName) {
  session.focusedBusinessId   = businessId;
  session.focusedBusinessName = businessName;
  session.updatedAt = Date.now();
  return session;
}

// ─── Search Context ────────────────────────────────────────────────────────────

/**
 * Update session with new search results.
 * NOW stores the full ranked business list with positions, not just IDs.
 *
 * @param {Object} session
 * @param {Object} param1
 * @param {string[]}  param1.businessIds    - For backwards compat
 * @param {Object[]}  param1.rankedList     - Full list: [{position, _id, name, category, rating, distanceKm, matchingMenuItems, reasons}]
 * @param {string}    param1.query          - Original query string
 * @param {Object}    param1.intent         - Extracted intent
 */
function updateSearchContext(session, { businessIds, rankedList, query, intent }) {
  session.lastSearchBusinessIds = businessIds || [];
  session.rankedBusinessList    = rankedList || [];
  session.lastSearchQuery       = query || null;
  session.lastSearchIntent      = intent || null;

  // Reset focus — new search starts fresh
  session.focusedBusinessId   = null;
  session.focusedBusinessName = null;

  // Reset comparison state
  session.comparisonTargets  = [];
  session.isInComparisonMode = false;

  // Initialise cumulative intent from the new search
  session.cumulativeIntent = intent ? { ...intent } : null;

  session.updatedAt = Date.now();
  return session;
}

// ─── Cumulative Intent Merging (NEW) ─────────────────────────────────────────

/**
 * Merge a new partial intent into the cumulative session intent.
 * This allows "show only halal" to add dietary:['halal'] without wiping
 * the previous category/menu filters.
 *
 * Rules:
 *  - Arrays (dietary, facility_filters): union merge
 *  - Scalars (category, price_max, min_rating): override if new value present
 *  - Booleans (has_coupons, is_open_now): OR merge
 *
 * @param {Object} session
 * @param {Object} newIntent - Partial intent from the latest turn
 * @returns {Object} - The merged cumulative intent
 */
function mergeCumulativeIntent(session, newIntent) {
  if (!session.cumulativeIntent) {
    session.cumulativeIntent = { ...newIntent };
    return session.cumulativeIntent;
  }

  const base = session.cumulativeIntent;
  const merged = { ...base };

  // Category — override if new one specified
  if (newIntent.category) merged.category = newIntent.category;

  // Menu keyword — override if new one specified
  if (newIntent.menu_keyword) {
    merged.menu_keyword  = newIntent.menu_keyword;
    merged.menu_keywords = newIntent.menu_keywords;
    merged.menu_items    = newIntent.menu_items;
  }

  // Price filters — override
  if (newIntent.price_max !== null) merged.price_max = newIntent.price_max;
  if (newIntent.price_min !== null) merged.price_min = newIntent.price_min;
  if (newIntent.budget_total !== null) merged.budget_total = newIntent.budget_total;

  // Rating — use the stricter of the two
  if (newIntent.min_rating !== null) {
    merged.min_rating = Math.max(base.min_rating || 0, newIntent.min_rating);
  }

  // Dietary — union merge (add, never remove)
  if (newIntent.dietary && newIntent.dietary.length > 0) {
    const baseDietary = base.dietary || [];
    merged.dietary = [...new Set([...baseDietary, ...newIntent.dietary])];
  }

  // Facility filters — union merge
  if (newIntent.facility_filters && newIntent.facility_filters.length > 0) {
    const baseF = base.facility_filters || [];
    merged.facility_filters = [...new Set([...baseF, ...newIntent.facility_filters])];
  }

  // Booleans — OR
  if (newIntent.has_coupons) merged.has_coupons = true;
  if (newIntent.is_open_now) merged.is_open_now = true;

  // Sort — override if new one specified
  if (newIntent.sort_by && newIntent.sort_by !== 'distance') {
    merged.sort_by = newIntent.sort_by;
  }

  // Location — override if city specified
  if (newIntent.city) merged.city = newIntent.city;

  // Distance max — use stricter (smaller)
  if (newIntent.distance_max !== null) {
    merged.distance_max = base.distance_max
      ? Math.min(base.distance_max, newIntent.distance_max)
      : newIntent.distance_max;
  }

  // Meal time — override
  if (newIntent.meal_time) merged.meal_time = newIntent.meal_time;

  session.cumulativeIntent = merged;
  return merged;
}

// ─── Ordinal Resolution (NEW) ─────────────────────────────────────────────────

/**
 * Resolve an ordinal word ("second") to the business object at that position
 * in the session's ranked business list.
 *
 * @param {Object} session
 * @param {string} ordinalWord - "first"|"second"|"third" etc.
 * @returns {Object|null} - Business object or null if not found
 */
function resolveOrdinal(session, ordinalWord) {
  if (!ordinalWord || !session.rankedBusinessList || session.rankedBusinessList.length === 0) {
    return null;
  }

  const lowerOrdinal = ordinalWord.toLowerCase().trim();
  let idx = ORDINAL_TO_INDEX[lowerOrdinal];

  if (idx === undefined) return null;

  // Handle "last" — map to final element
  if (idx === -1) idx = session.rankedBusinessList.length - 1;

  const business = session.rankedBusinessList[idx] || null;
  return business;
}

/**
 * Resolve an array of ordinal words to their business objects.
 *
 * @param {Object} session
 * @param {string[]} ordinalWords - e.g., ["first", "third"]
 * @returns {Object[]} - Array of resolved businesses (nulls filtered out)
 */
function resolveComparison(session, ordinalWords) {
  if (!ordinalWords || ordinalWords.length === 0) return [];
  return ordinalWords
    .map(word => resolveOrdinal(session, word))
    .filter(Boolean);
}

/**
 * Detect and return the ordinal word mentioned in a message.
 * Returns null if no ordinal is found.
 *
 * @param {string} message - User's message
 * @returns {string|null} - e.g., "second" or null
 */
function detectOrdinal(message) {
  const lower = message.toLowerCase();

  // 1. Match numeric ordinals first: "2nd", "1st", "3rd", "4th"
  const numericMatch = lower.match(/\b(\d+)(?:st|nd|rd|th)\b/);
  if (numericMatch) {
    const key = numericMatch[1] + (numericMatch[0].slice(-2)); // e.g. '2nd'
    if (ORDINAL_TO_INDEX[key] !== undefined) return key;
    // Try by raw number too
    if (ORDINAL_TO_INDEX[numericMatch[1]] !== undefined) return numericMatch[1];
  }

  // 2. Match "#2", "number 2", "no. 2"
  const hashMatch = lower.match(/(?:#|number\s+|no\.?\s*)(\d+)\b/);
  if (hashMatch && ORDINAL_TO_INDEX[hashMatch[1]] !== undefined) return hashMatch[1];

  // 3. Match word-form ordinals: "second", "third"
  const wordOrdinals = ['first','second','third','fourth','fifth','sixth','seventh','eighth','ninth','tenth','last'];
  for (const ordinal of wordOrdinals) {
    const regex = new RegExp(`\\b${ordinal}\\b`, 'i');
    if (regex.test(lower)) return ordinal;
  }

  return null;
}

/**
 * Detect if a message is referencing a comparison.
 *
 * @param {string} message - User's message
 * @returns {string[]|null} - Array of ordinal targets or null
 */
function detectComparisonTargets(message) {
  const lower = message.toLowerCase();
  // Pattern: "first and third", "first vs third", "first or third"
  const comparisonRegex = /\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)\b.*?\b(?:and|vs|versus|or|with)\b.*?\b(first|second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|last)\b/i;
  const match = lower.match(comparisonRegex);
  if (match) return [match[1], match[2]];

  // Pattern: "compare both" → first and second
  if (/compare\s+both\b|both\s+of\s+them/i.test(lower)) return ['first', 'second'];

  return null;
}

module.exports = {
  getSession,
  saveSession,
  deleteSession,
  createSession,
  appendMessage,
  getRecentHistory,
  focusBusiness,
  updateSearchContext,
  mergeCumulativeIntent,
  resolveOrdinal,
  resolveComparison,
  detectOrdinal,
  detectComparisonTargets,
  ORDINAL_TO_INDEX,
  SESSION_TTL,
};
