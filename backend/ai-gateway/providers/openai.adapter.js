/**
 * OpenAI Provider Adapter
 *
 * Calls the OpenAI API (or any OpenAI-compatible endpoint, e.g. Azure, Together.ai, Groq).
 *
 * Setup:
 *   AI_PRIMARY_PROVIDER=openai
 *   AI_OPENAI_API_KEY=sk-xxx
 *   AI_OPENAI_MODEL=gpt-4o-mini    (recommended: cheap + fast + excellent at JSON)
 *
 * Recommended models:
 *   gpt-4o-mini  → Best value: $0.15/1M input tokens, excellent JSON extraction
 *   gpt-4o       → Most capable, higher cost
 *
 * OpenAI-compatible endpoints (just change AI_OPENAI_BASE_URL):
 *   Groq:       https://api.groq.com/openai/v1  (free tier, very fast)
 *   Together.ai: https://api.together.xyz/v1
 *   Azure OpenAI: https://your-resource.openai.azure.com
 */

const AIProviderInterface = require('./interface');
const { INTENT_EXTRACTION_SYSTEM_PROMPT, INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');
const { MENU_EXTRACTION_SYSTEM_PROMPT, MENU_EXTRACTION_VERSION } = require('../prompts/menu_extraction_v1');

class OpenAIAdapter extends AIProviderInterface {
  constructor(config = {}) {
    super(config);
    this.providerName = 'openai';
    this.modelName = config.model || 'gpt-4o-mini';
    this.apiKey = config.apiKey || '';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.timeout = config.timeout || 20000;
  }

  /**
   * Extract intent using OpenAI's JSON mode.
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
      response_format: { type: 'json_object' },  // OpenAI JSON mode
      temperature: 0.1,
      max_tokens: 300,
    };

    const response = await this._fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '{}';

    const intent = this._parseIntentJSON(content);
    intent._meta = {
      provider: this.providerName,
      model: this.modelName,
      promptVersion: INTENT_EXTRACTION_VERSION,
      latencyMs: Date.now() - startTime,
      tokensUsed: data?.usage?.total_tokens,
    };

    return intent;
  }

  /**
   * Generate a human-friendly response using OpenAI.
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
        messages: [
          {
            role: 'system',
            content: 'You are a helpful local business discovery assistant. Write brief (max 20 words), friendly summaries of search results. Use an emoji when appropriate.',
          },
          {
            role: 'user',
            content: `Search: "${query}". Found ${count} business${count !== 1 ? 'es' : ''} including ${businessNames}. Write a 1-sentence friendly summary.`,
          },
        ],
        temperature: 0.5,
        max_tokens: 80,
      };

      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) throw new Error('OpenAI response generation failed');
      const data = await response.json();
      return data?.choices?.[0]?.message?.content?.trim() || this._templateResponse(context);
    } catch {
      return this._templateResponse(context);
    }
  }

  /**
   * Check OpenAI API connectivity.
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/models`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiKey}` } },
        5000
      );

      return {
        healthy: response.ok,
        latencyMs: Date.now() - startTime,
        provider: this.providerName,
        model: this.modelName,
        error: response.ok ? undefined : `HTTP ${response.status}`,
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

  /**
   * Analyse a base64-encoded menu image and extract all visible items.
   * Uses OpenAI vision (or any OpenRouter vision-capable model).
   */
  async extractMenuFromImage(imageBase64, options = {}) {
    const mimeType = options.mimeType || 'image/jpeg';
    const currency = options.currency || 'GBP';
    const startTime = Date.now();

    const body = {
      model: this.modelName,
      messages: [
        { role: 'system', content: MENU_EXTRACTION_SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Please extract all menu items from this image. Use currency code: ${currency}.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' },
            },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 4096,
    };

    const response = await this._fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // OpenRouter-specific headers (ignored by native OpenAI)
          'HTTP-Referer': 'https://hashview.app',
          'X-Title': 'HashView Menu Scanner',
        },
        body: JSON.stringify(body),
      },
      60000 // 60s timeout — vision can be slow
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Menu extraction API error ${response.status}: ${text}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '[]';
    const latencyMs = Date.now() - startTime;

    const items = this._parseMenuJSON(content, currency);

    console.log(`[OpenAI Adapter] extractMenuFromImage: extracted ${items.length} items in ${latencyMs}ms`);
    return items;
  }

  _parseMenuJSON(content, currency) {
    try {
      // Strip any markdown code fences the model might add despite instructions
      const clean = content
        .replace(/```json?\n?/gi, '')
        .replace(/```/g, '')
        .trim();
      const parsed = JSON.parse(clean);
      const arr = Array.isArray(parsed) ? parsed : (parsed.items || parsed.menu || []);

      const ALLOWED_TYPES    = ['food', 'drink', 'service', 'product', 'room', 'package'];
      const ALLOWED_DIETARY  = ['vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-free', 'kosher', 'organic'];

      return arr
        .filter(item => item && typeof item.name === 'string' && item.name.trim())
        .map(item => ({
          name:         item.name.trim(),
          menuCategory: (item.menuCategory || item.category || 'General').trim(),
          price:        Math.max(0, parseFloat(item.price) || 0),
          currency:     currency,
          description:  (item.description || '').trim(),
          type:         ALLOWED_TYPES.includes(item.type) ? item.type : 'food',
          dietary:      Array.isArray(item.dietary)
                          ? item.dietary.filter(d => ALLOWED_DIETARY.includes(d))
                          : [],
          tags:         Array.isArray(item.tags)
                          ? item.tags.slice(0, 5).map(t => String(t).toLowerCase().trim())
                          : [],
          isPopular:    Boolean(item.isPopular),
          isAvailable:  item.isAvailable !== false, // default to true
        }));
    } catch (err) {
      throw new Error(`Failed to parse menu extraction JSON: ${err.message}. Raw: ${content.slice(0, 300)}`);
    }
  }

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
      throw new Error(`Failed to parse OpenAI intent JSON: ${err.message}. Raw: ${content.slice(0, 200)}`);
    }
  }

  _templateResponse({ query, intent, resultCount }) {
    const count = resultCount || 0;
    if (count === 0) return `No results found for "${query}".`;
    const loc = intent?.city ? ` in ${intent.city}` : intent?.near_me ? ' near you' : '';
    return `Found ${count} business${count !== 1 ? 'es' : ''}${loc} matching your search.`;
  }
}

module.exports = OpenAIAdapter;
