/**
 * AI Provider Interface (Abstract Base)
 *
 * Every AI provider adapter MUST extend this class and implement all methods.
 * The calling pipeline code only ever interacts with this interface — it never
 * knows which concrete provider is behind it.
 *
 * ─── Contract ─────────────────────────────────────────────────────────────────
 *
 * extractIntent(query, options)  → Promise<IntentResult>
 *   Converts a natural language query into structured search filters.
 *   Input:  "chicken under £15 near me"
 *   Output: { category: "restaurant", menu_keyword: "chicken", price_max: 15, near_me: true }
 *
 * generateResponse(context)     → Promise<string>
 *   Generates a human-friendly summary of the search results.
 *   Input:  { query, intent, businesses: [...], resultCount }
 *   Output: "Found 4 restaurants near you with chicken dishes under £15 🍗"
 *
 * extractMenuFromImage(imageBase64, options) → Promise<MenuItemDraft[]>
 *   Analyses a base64-encoded menu image and returns an array of structured
 *   menu item objects ready for bulk insertion.
 *   Input:  { imageBase64: "...", mimeType: "image/jpeg", currency: "GBP" }
 *   Output: [{ name, menuCategory, price, currency, description, type, dietary, tags, isPopular, isAvailable }, ...]
 *
 * healthCheck()                 → Promise<HealthStatus>
 *   Returns whether the provider is reachable and responsive.
 *   Output: { healthy: true, latencyMs: 120, model: "qwen2.5:7b" }
 *
 * getModelInfo()                → Object
 *   Returns static info about this adapter's model configuration.
 */

class AIProviderInterface {
  constructor(config = {}) {
    if (new.target === AIProviderInterface) {
      throw new Error('AIProviderInterface is abstract — instantiate a concrete adapter instead.');
    }
    this.config = config;
    this.providerName = 'unknown'; // Must be overridden
    this.modelName = 'unknown';   // Must be overridden
  }

  /**
   * Extract structured intent from a natural language query.
   * @param {string} query - Raw user query, e.g. "cheap chinese near me"
   * @param {Object} [options]
   * @param {string} [options.systemPrompt] - Override the default system prompt
   * @param {string} [options.promptVersion] - Prompt version for logging
   * @returns {Promise<IntentResult>}
   */
  async extractIntent(query, options = {}) {
    throw new Error(`${this.constructor.name} must implement extractIntent()`);
  }

  /**
   * Generate a human-friendly summary message for the search results.
   * @param {Object} context
   * @param {string}   context.query           - Original user query
   * @param {Object}   context.intent          - Extracted intent filters
   * @param {Array}    context.businesses       - Matched business objects
   * @param {number}   context.resultCount      - Total result count
   * @param {boolean}  [context.fallbackUsed]   - Whether AI intent extraction failed
   * @returns {Promise<string>} - Human-friendly message
   */
  async generateResponse(context) {
    throw new Error(`${this.constructor.name} must implement generateResponse()`);
  }

  /**
   * Extract structured menu items from a base64-encoded menu image.
   * @param {string} imageBase64 - Base64-encoded image data
   * @param {Object} [options]
   * @param {string} [options.mimeType]  - MIME type of the image (default: 'image/jpeg')
   * @param {string} [options.currency]  - Currency code to apply (default: 'GBP')
   * @returns {Promise<Array>} - Array of MenuItemDraft objects
   */
  async extractMenuFromImage(imageBase64, options = {}) {
    throw new Error(`${this.constructor.name} must implement extractMenuFromImage()`);
  }

  /**
   * Check if this provider is reachable and healthy.
   * @returns {Promise<HealthStatus>}
   */
  async healthCheck() {
    throw new Error(`${this.constructor.name} must implement healthCheck()`);
  }

  /**
   * Return static metadata about this adapter.
   * @returns {{ provider: string, model: string, capabilities: string[] }}
   */
  getModelInfo() {
    return {
      provider: this.providerName,
      model: this.modelName,
      capabilities: ['extractIntent', 'generateResponse', 'extractMenuFromImage', 'healthCheck'],
    };
  }
}

module.exports = AIProviderInterface;
