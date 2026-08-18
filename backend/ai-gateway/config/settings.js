/**
 * AI Gateway — Configuration Settings
 *
 * All AI-related environment variables are read here and nowhere else.
 * To switch providers: change AI_PRIMARY_PROVIDER in .env — zero code changes.
 *
 * Supported providers:
 *   mock      → deterministic fake responses (for local dev without any AI)
 *   ollama    → self-hosted local model (requires Ollama running somewhere)
 *   openai    → OpenAI API (gpt-4o-mini, gpt-4o, etc.)
 *   anthropic → Anthropic API (claude-3-haiku, claude-3-5-sonnet, etc.)
 */

const settings = {
  // ─── Provider Selection ───────────────────────────────────────────────────────
  primaryProvider: process.env.AI_PRIMARY_PROVIDER || 'mock',
  fallbackProvider: process.env.AI_FALLBACK_PROVIDER || 'mock',

  // ─── Ollama Config ────────────────────────────────────────────────────────────
  ollama: {
    baseUrl: process.env.AI_OLLAMA_BASE_URL || 'http://localhost:11434',
    model: process.env.AI_OLLAMA_MODEL || 'qwen2.5:7b',
    timeout: parseInt(process.env.AI_OLLAMA_TIMEOUT || '30000', 10),
  },

  // ─── OpenAI Config ────────────────────────────────────────────────────────────
  openai: {
    apiKey: process.env.AI_OPENAI_API_KEY || '',
    model: process.env.AI_OPENAI_MODEL || 'gpt-4o-mini',
    // visionModel is used exclusively for image-to-menu extraction.
    // Set AI_OPENAI_VISION_MODEL to any vision-capable model (e.g. on OpenRouter).
    // If not set, falls back to AI_OPENAI_MODEL.
    visionModel: process.env.AI_OPENAI_VISION_MODEL || process.env.AI_OPENAI_MODEL || 'gpt-4o-mini',
    baseUrl: process.env.AI_OPENAI_BASE_URL || 'https://api.openai.com/v1',
  },

  // ─── Anthropic Config ─────────────────────────────────────────────────────────
  anthropic: {
    apiKey: process.env.AI_ANTHROPIC_API_KEY || '',
    model: process.env.AI_ANTHROPIC_MODEL || 'claude-3-haiku-20240307',
    baseUrl: process.env.AI_ANTHROPIC_BASE_URL || 'https://api.anthropic.com',
  },

  // ─── Groq Config ───────────────────────────────────────────────────────────────────
  // 100% free — 14,400 req/day, no billing. Sign up at https://console.groq.com
  groq: {
    apiKey: process.env.AI_GROQ_API_KEY || '',
    model: process.env.AI_GROQ_MODEL || 'gpt-oss-120b',
    visionModel: process.env.AI_GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
    baseUrl: process.env.AI_GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  },

  // ─── Google Gemini Config ─────────────────────────────────────────────────────
  // Free tier: 1,500 req/day · 15 RPM · 1M TPM (Google AI Studio key, no billing)
  // Get a key at: https://aistudio.google.com/apikey
  gemini: {
    apiKey: process.env.AI_GEMINI_API_KEY || '',
    model: process.env.AI_GEMINI_MODEL || 'gemini-2.0-flash',
    visionModel: process.env.AI_GEMINI_VISION_MODEL || process.env.AI_GEMINI_MODEL || 'gemini-2.0-flash',
    baseUrl: process.env.AI_GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta/openai',
  },

  // ─── HuggingFace Config ──────────────────────────────────────────────────────
  // Free tier — just needs a free HF account token (no billing)
  // Token: https://huggingface.co/settings/tokens
  huggingface: {
    apiKey: process.env.AI_HF_API_KEY || '',
    model: process.env.AI_HF_MODEL || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    visionModel: process.env.AI_HF_VISION_MODEL || 'Qwen/Qwen2.5-VL-7B-Instruct',
    baseUrl: process.env.AI_HF_BASE_URL || 'https://router.huggingface.co/hf-inference/v1',
  },

  // ─── Search Pipeline Config ───────────────────────────────────────────────────
  search: {
    defaultRadius: parseInt(process.env.AI_SEARCH_DEFAULT_RADIUS || '10000', 10), // metres
    maxResults: parseInt(process.env.AI_SEARCH_MAX_RESULTS || '20', 10),
    maxQueryLength: parseInt(process.env.AI_SEARCH_MAX_QUERY_LENGTH || '300', 10),
    cacheEnabled: process.env.AI_SEARCH_CACHE_ENABLED !== 'false',
    cacheTtlSeconds: parseInt(process.env.AI_SEARCH_CACHE_TTL || '300', 10), // 5 min

    // Relevance ranking weights (must sum to 1.0)
    weights: {
      distance: parseFloat(process.env.AI_WEIGHT_DISTANCE || '0.30'),
      rating: parseFloat(process.env.AI_WEIGHT_RATING || '0.25'),
      menuMatch: parseFloat(process.env.AI_WEIGHT_MENU_MATCH || '0.20'),
      recency: parseFloat(process.env.AI_WEIGHT_RECENCY || '0.10'),
      popularity: parseFloat(process.env.AI_WEIGHT_POPULARITY || '0.05'),
      couponBonus: parseFloat(process.env.AI_WEIGHT_COUPON || '0.05'),
      verification: parseFloat(process.env.AI_WEIGHT_VERIFICATION || '0.05'),
    },
  },

  // ─── Rate Limiting ────────────────────────────────────────────────────────────
  rateLimit: {
    windowMs: parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 min
    maxPerUser: parseInt(process.env.AI_RATE_LIMIT_PER_USER || '30', 10), // 30 req/min per user
    maxGlobal: parseInt(process.env.AI_RATE_LIMIT_GLOBAL || '500', 10), // 500 req/min global
  },

  // ─── JWT ──────────────────────────────────────────────────────────────────────
  jwtSecret: process.env.JWT_SECRET || '',

  // ─── Logging ──────────────────────────────────────────────────────────────────
  logSearches: process.env.AI_LOG_SEARCHES !== 'false', // true by default
};

module.exports = settings;
