/**
 * Ollama Provider Adapter
 *
 * Calls a self-hosted Ollama instance (local or remote EC2).
 * Compatible with any model loaded in Ollama: qwen2.5:7b, llama3.2, mistral, gemma2, etc.
 *
 * Setup:
 *   AI_PRIMARY_PROVIDER=ollama
 *   AI_OLLAMA_BASE_URL=http://your-ec2-ip:11434   (or http://localhost:11434)
 *   AI_OLLAMA_MODEL=qwen2.5:7b
 *
 * Recommended models for intent extraction (low RAM, fast):
 *   qwen2.5:7b     → Best balance of speed and accuracy (~4GB RAM)
 *   llama3.2:3b    → Fastest option (~2GB RAM, slightly less accurate)
 *   mistral:7b     → Good alternative (~4GB RAM)
 *   gemma2:9b      → Excellent for structured output (~5GB RAM)
 */

const AIProviderInterface = require('./interface');
const { INTENT_EXTRACTION_SYSTEM_PROMPT, INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');

class OllamaAdapter extends AIProviderInterface {
  constructor(config = {}) {
    super(config);
    this.providerName = 'ollama';
    this.modelName = config.model || 'qwen2.5:7b';
    this.baseUrl = config.baseUrl || 'http://localhost:11434';
    this.timeout = config.timeout || 30000;
  }

  /**
   * Extract intent using Ollama's /api/chat endpoint.
   * Uses the JSON system prompt to ensure structured output.
   */
  async extractIntent(query, options = {}) {
    const systemPrompt = options.systemPrompt || INTENT_EXTRACTION_SYSTEM_PROMPT;
    const startTime = Date.now();

    const body = {
      model: this.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: query },
      ],
      stream: false,
      format: 'json',  // Ollama native JSON mode — forces valid JSON output
      options: {
        temperature: 0.1,  // Low temperature for deterministic extraction
        num_predict: 256,  // Limit tokens — intent JSON is small
      },
    };

    const response = await this._fetchWithTimeout(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Ollama API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data?.message?.content || '{}';

    // Parse and validate JSON
    const intent = this._parseIntentJSON(content);
    intent._meta = {
      provider: this.providerName,
      model: this.modelName,
      promptVersion: INTENT_EXTRACTION_VERSION,
      latencyMs: Date.now() - startTime,
    };

    return intent;
  }

  /**
   * Generate a human-friendly search summary using Ollama.
   */
  async generateResponse(context) {
    const { query, intent, businesses, resultCount } = context;
    const count = resultCount || (businesses || []).length;

    // For low result counts, use template (faster, cheaper)
    if (count === 0) {
      return `No businesses found matching "${query}". Try different keywords or expand your search area.`;
    }

    const businessNames = (businesses || [])
      .slice(0, 3)
      .map(b => b.name)
      .join(', ');

    const userMessage = `Search: "${query}". Found ${count} businesses including: ${businessNames}. Write a short, friendly 1-sentence summary (max 20 words).`;

    try {
      const body = {
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a helpful local business finder assistant. Write brief, friendly search result summaries.' },
          { role: 'user', content: userMessage },
        ],
        stream: false,
        options: { temperature: 0.4, num_predict: 60 },
      };

      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/api/chat`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      );

      if (!response.ok) throw new Error('Ollama response generation failed');
      const data = await response.json();
      return data?.message?.content?.trim() || this._templateResponse(context);
    } catch (err) {
      // Fallback to template if AI response generation fails
      return this._templateResponse(context);
    }
  }

  /**
   * Ping Ollama to check if it's running and the model is loaded.
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/api/tags`,
        { method: 'GET' },
        5000  // Short timeout for health checks
      );

      if (!response.ok) {
        return { healthy: false, latencyMs: Date.now() - startTime, provider: this.providerName, model: this.modelName, error: `HTTP ${response.status}` };
      }

      const data = await response.json();
      const models = (data?.models || []).map(m => m.name);
      const modelLoaded = models.some(m => m.startsWith(this.modelName.split(':')[0]));

      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        provider: this.providerName,
        model: this.modelName,
        modelLoaded,
        availableModels: models,
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
      // Strip any accidental markdown fences
      const clean = content.replace(/```json?\n?/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(clean);
      // Ensure required boolean fields have correct types
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
      // If JSON parsing fails, return a safe default (will trigger regex fallback)
      throw new Error(`Failed to parse Ollama intent JSON: ${err.message}. Raw: ${content.slice(0, 200)}`);
    }
  }

  _templateResponse({ query, intent, resultCount }) {
    const count = resultCount || 0;
    if (count === 0) return `No results found for "${query}".`;
    const loc = intent?.city ? ` in ${intent.city}` : intent?.near_me ? ' near you' : '';
    return `Found ${count} business${count !== 1 ? 'es' : ''}${loc} matching your search.`;
  }
}

module.exports = OllamaAdapter;
