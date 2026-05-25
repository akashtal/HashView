const mongoose = require('mongoose');

/**
 * SearchLog — records every AI search query for analytics and ranking improvement.
 *
 * This collection is the key data asset for:
 *  - Tuning ranking weights (which results users click vs. ignore)
 *  - Identifying zero-result queries (data gaps to fill)
 *  - A/B testing prompt versions
 *  - Building UserPreference model in Phase 5
 *  - Monitoring AI provider performance and costs
 *
 * Written by: AI Gateway (Phase 2+)
 * Read by:    Admin analytics dashboard, ranking algorithm, personalization engine
 */
const searchLogSchema = new mongoose.Schema({
  // ─── Who & What ──────────────────────────────────────────────────────────────
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
    // May be null for unauthenticated searches (future guest mode)
  },
  sessionId: {
    type: String   // Client-generated session ID to group queries in one session
  },

  // Raw query exactly as the user typed it
  query: {
    type: String,
    required: true,
    maxlength: 500
  },

  // Structured intent extracted by the AI (or regex fallback)
  intent: {
    type: mongoose.Schema.Types.Mixed   // JSON object: { category, price_max, menu_keyword, ... }
  },

  // ─── AI Provider Metadata ────────────────────────────────────────────────────
  provider: {
    type: String   // "ollama", "openai", "anthropic", "huggingface", "mock", "fallback"
  },
  model: {
    type: String   // "qwen2.5:7b", "gpt-4o-mini", "claude-3-haiku", etc.
  },
  promptVersion: {
    type: String   // "intent_v1", "intent_v2" — for A/B testing prompts
  },
  fallbackUsed: {
    type: Boolean,
    default: false  // true = AI was down, regex fallback was used
  },

  // ─── Results ─────────────────────────────────────────────────────────────────
  resultCount: {
    type: Number,
    default: 0
  },
  resultBusinessIds: {
    type: [mongoose.Schema.Types.ObjectId]  // IDs of returned businesses (in rank order)
  },
  cached: {
    type: Boolean,
    default: false  // true = served from Redis cache (AI not called)
  },

  // ─── Location Context ─────────────────────────────────────────────────────────
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number]  // [longitude, latitude]
    }
  },
  locationGrid: {
    type: String    // Snapped grid key e.g. "51.507:-0.128" (for cache key analysis)
  },

  // ─── Performance Metrics ──────────────────────────────────────────────────────
  latency: {
    intentMs:   { type: Number },   // Time for AI intent extraction
    queryMs:    { type: Number },   // Time for MongoDB query execution
    rankMs:     { type: Number },   // Time for ranking algorithm
    totalMs:    { type: Number }    // Total end-to-end response time
  },

  // ─── User Feedback (filled in after user interacts with results) ──────────────
  feedback: {
    type: String,
    enum: [null, 'helpful', 'not_helpful'],
    default: null
  },

  // ─── Error Tracking ───────────────────────────────────────────────────────────
  error: {
    type: String    // Error message if the search failed
  }

}, {
  timestamps: true
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// User search history (for personalization engine in Phase 5)
searchLogSchema.index({ user: 1, createdAt: -1 });

// Analytics: search volume over time
searchLogSchema.index({ createdAt: -1 });

// Provider analytics: which provider was used when
searchLogSchema.index({ provider: 1, createdAt: -1 });

// Zero-result analysis: find queries with no results
searchLogSchema.index({ resultCount: 1, createdAt: -1 });

// Geospatial: not 2dsphere (we only need location_grid for cache analysis)
searchLogSchema.index({ locationGrid: 1 });

// Performance monitoring
searchLogSchema.index({ 'latency.totalMs': 1 });

module.exports = mongoose.model('SearchLog', searchLogSchema);
