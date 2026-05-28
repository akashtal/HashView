/**
 * AI Provider Router
 *
 * The ProviderRouter is the single entry point for all AI operations.
 * It:
 *  1. Instantiates the correct adapter based on AI_PRIMARY_PROVIDER
 *  2. Attempts the operation on the primary provider
 *  3. If primary fails → automatically falls back to AI_FALLBACK_PROVIDER
 *  4. If both fail → falls back to the always-available MockAdapter (regex-based)
 *
 * The pipeline code only ever calls router.extractIntent() and router.generateResponse().
 * It never knows which actual provider handled the request.
 *
 * ─── Provider Switching ───────────────────────────────────────────────────────
 *
 * To switch providers, change ONE env var:
 *   AI_PRIMARY_PROVIDER=ollama     → Uses Ollama
 *   AI_PRIMARY_PROVIDER=openai     → Uses OpenAI
 *   AI_PRIMARY_PROVIDER=anthropic  → Uses Anthropic
 *   AI_PRIMARY_PROVIDER=mock       → Uses regex fallback (no AI)
 *
 * Zero code changes. Zero restart of Express backend required.
 */

const settings = require('../config/settings');

const MockAdapter     = require('./mock.adapter');
const OllamaAdapter   = require('./ollama.adapter');
const OpenAIAdapter   = require('./openai.adapter');
const AnthropicAdapter = require('./anthropic.adapter');

// ─── Adapter Factory ──────────────────────────────────────────────────────────

function createAdapter(providerName) {
  switch (providerName) {
    case 'ollama':
      return new OllamaAdapter(settings.ollama);

    case 'openai':
      if (!settings.openai.apiKey) {
        console.warn('[AI Router] OpenAI selected but AI_OPENAI_API_KEY is not set. Falling back to mock.');
        return new MockAdapter();
      }
      return new OpenAIAdapter(settings.openai);

    case 'anthropic':
      if (!settings.anthropic.apiKey) {
        console.warn('[AI Router] Anthropic selected but AI_ANTHROPIC_API_KEY is not set. Falling back to mock.');
        return new MockAdapter();
      }
      return new AnthropicAdapter(settings.anthropic);

    case 'mock':
    default:
      return new MockAdapter();
  }
}

// ─── Router ───────────────────────────────────────────────────────────────────

class ProviderRouter {
  constructor() {
    this.primaryProvider   = createAdapter(settings.primaryProvider);
    this.fallbackProvider  = createAdapter(settings.fallbackProvider);
    this.mockAdapter       = new MockAdapter(); // Always available as last resort

    console.log(`[AI Router] Primary provider:  ${this.primaryProvider.providerName} (${this.primaryProvider.modelName})`);
    console.log(`[AI Router] Fallback provider: ${this.fallbackProvider.providerName} (${this.fallbackProvider.modelName})`);
  }

  /**
   * Extract intent with automatic failover.
   * Returns { intent, provider, fallbackUsed }
   */
  async extractIntent(query, options = {}) {
    // 1. Try primary provider
    try {
      const intent = await this.primaryProvider.extractIntent(query, options);
      return {
        intent,
        provider: this.primaryProvider.providerName,
        model: this.primaryProvider.modelName,
        fallbackUsed: false,
      };
    } catch (primaryErr) {
      console.warn(`[AI Router] Primary provider (${this.primaryProvider.providerName}) failed: ${primaryErr.message}`);
    }

    // 2. Try fallback provider (if different from primary)
    if (this.fallbackProvider.providerName !== this.primaryProvider.providerName) {
      try {
        const intent = await this.fallbackProvider.extractIntent(query, options);
        return {
          intent,
          provider: this.fallbackProvider.providerName,
          model: this.fallbackProvider.modelName,
          fallbackUsed: true,
        };
      } catch (fallbackErr) {
        console.warn(`[AI Router] Fallback provider (${this.fallbackProvider.providerName}) failed: ${fallbackErr.message}`);
      }
    }

    // 3. Last resort: regex-based mock (never fails)
    console.warn('[AI Router] Both providers failed. Using regex-based mock fallback.');
    const intent = await this.mockAdapter.extractIntent(query, options);
    return {
      intent,
      provider: 'mock',
      model: 'regex-fallback-v1',
      fallbackUsed: true,
    };
  }

  /**
   * Generate response message with automatic failover.
   */
  async generateResponse(context) {
    // 1. Try primary
    try {
      return await this.primaryProvider.generateResponse(context);
    } catch (primaryErr) {
      console.warn(`[AI Router] generateResponse primary failed: ${primaryErr.message}`);
    }

    // 2. Try fallback
    if (this.fallbackProvider.providerName !== this.primaryProvider.providerName) {
      try {
        return await this.fallbackProvider.generateResponse(context);
      } catch (fallbackErr) {
        console.warn(`[AI Router] generateResponse fallback failed: ${fallbackErr.message}`);
      }
    }

    // 3. Mock template (never fails)
    return await this.mockAdapter.generateResponse(context);
  }

  /**
   * Health check for all configured providers.
   */
  async healthCheck() {
    const [primaryHealth, fallbackHealth] = await Promise.allSettled([
      this.primaryProvider.healthCheck(),
      this.primaryProvider.providerName !== this.fallbackProvider.providerName
        ? this.fallbackProvider.healthCheck()
        : Promise.resolve({ healthy: true, provider: 'mock', model: 'regex-fallback', latencyMs: 0 }),
    ]);

    return {
      primary:  primaryHealth.status  === 'fulfilled' ? primaryHealth.value  : { healthy: false, error: primaryHealth.reason?.message },
      fallback: fallbackHealth.status === 'fulfilled' ? fallbackHealth.value : { healthy: false, error: fallbackHealth.reason?.message },
      config: {
        primaryProvider:  settings.primaryProvider,
        fallbackProvider: settings.fallbackProvider,
      },
    };
  }

  /**
   * Get the active provider name (for logging/analytics).
   */
  getActiveProviderName() {
    return this.primaryProvider.providerName;
  }
}

// Singleton — one router instance shared across all requests
let _instance = null;
function getRouter() {
  if (!_instance) _instance = new ProviderRouter();
  return _instance;
}

module.exports = { getRouter, ProviderRouter };
