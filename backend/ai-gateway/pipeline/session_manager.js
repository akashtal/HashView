/**
 * AI Chat Session Manager
 *
 * Stores conversation state in Redis with a 30-minute TTL.
 * Each session tracks:
 *  - Full message history (user + assistant turns)
 *  - Which business the conversation is currently focused on
 *  - The last search results (so follow-up questions have context)
 *  - User location (for location-aware answers)
 *
 * Key format:  ai:chat:{sessionId}
 * TTL:         30 minutes (auto-expires idle sessions)
 */

const SESSION_TTL = 1800; // 30 minutes in seconds
const MAX_HISTORY = 20;   // Keep last 20 messages (10 turns) to control token usage
const KEY_PREFIX  = 'ai:chat:';

let _redis = null;

function getRedis() {
  if (!_redis) {
    try {
      _redis = require('../../config/redis');
    } catch {
      _redis = null;
    }
  }
  return _redis;
}

// ─── Session CRUD ─────────────────────────────────────────────────────────────

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

// ─── Session Helpers ──────────────────────────────────────────────────────────

/**
 * Create a new empty session.
 */
function createSession(options = {}) {
  return {
    userId:               options.userId || null,
    messages:             [],
    focusedBusinessId:    null,   // Business currently being discussed
    focusedBusinessName:  null,
    lastSearchBusinessIds: [],    // IDs from the most recent search
    lastSearchQuery:      null,   // The original search query
    lastSearchIntent:     null,   // Extracted intent from last search
    location:             options.location || null,
    createdAt:            Date.now(),
    updatedAt:            Date.now(),
  };
}

/**
 * Append a message to a session and prune if over the limit.
 * Always keeps at least the first message (establishes context).
 */
function appendMessage(session, role, content, meta = {}) {
  session.messages.push({
    role,       // 'user' | 'assistant'
    content,
    timestamp:  Date.now(),
    ...meta,    // businessIds, suggestedFollowUps, contextUsed, etc.
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
 * Get the last N messages formatted for LangChain.
 * Returns an array of { role, content } objects.
 */
function getRecentHistory(session, limit = 10) {
  return session.messages
    .slice(-limit)
    .map(msg => ({ role: msg.role, content: msg.content }));
}

/**
 * Update session focus to a specific business.
 */
function focusBusiness(session, businessId, businessName) {
  session.focusedBusinessId   = businessId;
  session.focusedBusinessName = businessName;
  session.updatedAt = Date.now();
  return session;
}

/**
 * Update session with new search results.
 */
function updateSearchContext(session, { businessIds, query, intent }) {
  session.lastSearchBusinessIds = businessIds || [];
  session.lastSearchQuery       = query || null;
  session.lastSearchIntent      = intent || null;
  // Reset business focus — new search starts fresh
  session.focusedBusinessId   = null;
  session.focusedBusinessName = null;
  session.updatedAt = Date.now();
  return session;
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
  SESSION_TTL,
};
