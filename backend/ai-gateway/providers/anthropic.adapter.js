/**
 * Anthropic Provider Adapter
 *
 * Calls the Anthropic API (Claude models).
 *
 * Setup:
 *   AI_PRIMARY_PROVIDER=anthropic
 *   AI_ANTHROPIC_API_KEY=sk-ant-xxx
 *   AI_ANTHROPIC_MODEL=claude-3-haiku-20240307   (recommended: fast + cheap)
 *
 * Recommended models:
 *   claude-3-haiku-20240307  → Fastest, cheapest, excellent for structured extraction
 *   claude-3-5-sonnet-20241022 → Most capable Claude, higher cost
 */

const AIProviderInterface = require('./interface');
const { INTENT_EXTRACTION_SYSTEM_PROMPT, INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');

class AnthropicAdapter extends AIProviderInterface {
  constructor(config = {}) {
    super(config);
    this.providerName = 'anthropic';
    this.modelName = config.model || 'claude-3-haiku-20240307';
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com';
    this.timeout = config.timeout || 20000;
    this.apiVersion = '2023-06-01'; // Anthropic API version header
  }

  /**
   * Extract intent using Anthropic's messages API.
   * Note: Anthropic uses system as a separate parameter, not in messages array.
   */
  async extractIntent(query, options = {}) {
    const systemPrompt = options.systemPrompt || INTENT_EXTRACTION_SYSTEM_PROMPT;
    const startTime = Date.now();

    const body = {
      model: this.modelName,
      max_tokens: 300,
      system: systemPrompt,  // Anthropic puts system prompt here, not in messages
      messages: [
        { role: 'user', content: query },
      ],
      temperature: 0.1,
    };

    const response = await this._fetchWithTimeout(
      `${this.baseUrl}/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': this.apiVersion,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data?.content?.[0]?.text || '{}';

    const intent = this._parseIntentJSON(content);
    intent._meta = {
      provider: this.providerName,
      model: this.modelName,
      promptVersion: INTENT_EXTRACTION_VERSION,
      latencyMs: Date.now() - startTime,
      tokensUsed: (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0),
    };

    return intent;
  }

  /**
   * Generate a human-friendly response using Anthropic.
   */
  async generateResponse(context) {
    const { query, intent, businesses, resultCount } = context;
    const count = resultCount || (businesses || []).length;

    if (count === 0) {
      return `No businesses found matching "${query}". Try different keywords or expand your search area.`;
    }

    const businessNames = (businesses || []).slice(0, 3).map(b => b.name).join(', ');

    try {
      const body = {
        model: this.modelName,
        max_tokens: 80,
        system: 'You are a helpful local business discovery assistant. Write brief (max 20 words), friendly summaries. Use an emoji.',
        messages: [{
          role: 'user',
          content: `Search: "${query}". Found ${count} business${count !== 1 ? 'es' : ''} including ${businessNames}. Write a friendly 1-sentence summary.`,
        }],
        temperature: 0.5,
      };

      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': this.apiVersion,
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error('Anthropic response generation failed');
      const data = await response.json();
      return data?.content?.[0]?.text?.trim() || this._templateResponse(context);
    } catch {
      return this._templateResponse(context);
    }
  }

  /**
   * Check Anthropic API connectivity with a minimal request.
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      // Use a minimal message to verify connectivity + API key validity
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/v1/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': this.apiVersion,
          },
          body: JSON.stringify({
            model: this.modelName,
            max_tokens: 5,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        },
        5000
      );

      return {
        healthy: response.ok || response.status === 400, // 400 = API reachable but bad request is fine for health check
        latencyMs: Date.now() - startTime,
        provider: this.providerName,
        model: this.modelName,
        error: (response.ok || response.status === 400) ? undefined : `HTTP ${response.status}`,
      };
    } catch (err) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        provider: this.providerName,
        model: this.modelName,
        error: err.message,
      };
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  async _fetchWithTimeout(url, options, timeout = this.timeout) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  _parseIntentJSON(content) {
    try {
      // Claude sometimes wraps JSON in markdown fences
      const clean = content.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      return {
        category:     parsed.category     || null,
        menu_keyword: parsed.menu_keyword || null,
        price_max:    parsed.price_max    !== undefined ? Number(parsed.price_max) || null : null,
        price_min:    parsed.price_min    !== undefined ? Number(parsed.price_min) || null : null,
        near_me:      Boolean(parsed.near_me ?? true),
        city:         parsed.city         || null,
        area:         parsed.area         || null,
        min_rating:   parsed.min_rating   !== undefined ? Number(parsed.min_rating) || null : null,
        sort_by:      parsed.sort_by      || 'distance',
        has_coupons:  Boolean(parsed.has_coupons),
        is_open_now:  Boolean(parsed.is_open_now),
        dietary:      Array.isArray(parsed.dietary) && parsed.dietary.length > 0 ? parsed.dietary : null,
        is_off_topic: Boolean(parsed.is_off_topic),
      };
    } catch (err) {
      throw new Error(`Failed to parse Anthropic intent JSON: ${err.message}. Raw: ${content.slice(0, 200)}`);
    }
  }

  _templateResponse({ query, intent, resultCount }) {
    const count = resultCount || 0;
    if (count === 0) return `No results found for "${query}".`;
    const loc = intent?.city ? ` in ${intent.city}` : intent?.near_me ? ' near you' : '';
    return `Found ${count} business${count !== 1 ? 'es' : ''}${loc} matching your search.`;
  }
}

module.exports = AnthropicAdapter;
