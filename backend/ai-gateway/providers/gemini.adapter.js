/**
 * Google Gemini Provider Adapter — Native REST API
 *
 * Uses the native Gemini REST API (NOT the OpenAI-compatible wrapper).
 * Authentication: ?key=API_KEY query parameter (the only method that works
 * for AQ. format API keys from Google AI Studio / Agent Platform).
 *
 * ─── Why native API instead of OpenAI-compat? ────────────────────────────────
 *   Google AI Studio issues keys in AQ. format. These keys ONLY work via the
 *   ?key= query parameter. The OpenAI-compat endpoint requires Authorization:
 *   Bearer which fails with ACCESS_TOKEN_TYPE_UNSUPPORTED for AQ. keys.
 *
 * ─── Endpoint ────────────────────────────────────────────────────────────────
 *   POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}
 *
 * ─── Free Tier (Google AI Studio) ───────────────────────────────────────────
 *   gemini-2.0-flash    → 15 RPM · 1,500 RPD · 1M TPM  (VISION ✓)
 *   gemini-1.5-flash    → 15 RPM · 1,500 RPD · 1M TPM  (VISION ✓)
 *   gemini-1.5-flash-8b → 15 RPM · 1,500 RPD · 1M TPM  (VISION ✓)
 */

const AIProviderInterface = require('./interface');
const { INTENT_EXTRACTION_SYSTEM_PROMPT, INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');
const { MENU_EXTRACTION_SYSTEM_PROMPT } = require('../prompts/menu_extraction_v1');
// Reuse the JSON parsing helpers from OpenAI adapter
const OpenAIAdapter = require('./openai.adapter');

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

class GeminiAdapter extends OpenAIAdapter {
  constructor(config = {}) {
    // We still call super so we inherit _parseMenuJSON, _parseIntentJSON, _fetchWithTimeout
    super({
      apiKey:      config.apiKey      || '',
      model:       config.model       || 'gemini-2.0-flash',
      visionModel: config.visionModel || config.model || 'gemini-2.0-flash',
      baseUrl:     GEMINI_BASE,
      timeout:     config.timeout     || 30000,
    });
    this.providerName = 'gemini';
  }

  // ─── Native API Helpers ───────────────────────────────────────────────────────

  /**
   * Build the native Gemini API URL for a model.
   * Authentication is via ?key= query parameter — the only method that works
   * for AQ. format keys from Google AI Studio / Agent Platform.
   */
  _geminiUrl(model, action = 'generateContent') {
    return `${GEMINI_BASE}/models/${model}:${action}?key=${encodeURIComponent(this.apiKey)}`;
  }

  /**
   * Convert our standard messages array to Gemini native format.
   * Handles text-only and text+image content.
   */
  _toGeminiRequest(messages, generationConfig = {}) {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Gemini uses systemInstruction separately
        systemInstruction = {
          parts: [{ text: msg.content }],
        };
        continue;
      }

      const parts = [];

      if (typeof msg.content === 'string') {
        parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'text') {
            parts.push({ text: part.text });
          } else if (part.type === 'image_url') {
            // Convert data URL to Gemini inlineData format
            const dataUrl = part.image_url?.url || '';
            const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (match) {
              parts.push({
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              });
            }
          }
        }
      }

      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts,
      });
    }

    const body = { contents, generationConfig };
    if (systemInstruction) body.systemInstruction = systemInstruction;
    return body;
  }

  /**
   * Extract the text content from a native Gemini response.
   */
  _extractGeminiText(data) {
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  /**
   * Call the native Gemini generateContent endpoint.
   */
  async _callGemini(model, messages, generationConfig = {}, timeoutMs = this.timeout) {
    const url = this._geminiUrl(model);
    const body = this._toGeminiRequest(messages, generationConfig);

    const response = await this._fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      timeoutMs
    );

    return response;
  }

  // ─── Interface Implementation ─────────────────────────────────────────────────

  /**
   * Extract structured search intent from a natural language query.
   */
  async extractIntent(query, options = {}) {
    const systemPrompt = options.systemPrompt || INTENT_EXTRACTION_SYSTEM_PROMPT;
    const startTime = Date.now();

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user',   content: query },
    ];

    const response = await this._callGemini(
      this.modelName,
      messages,
      { temperature: 0.1, maxOutputTokens: 400 }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 300)}`);
    }

    const data = await response.json();
    const content = this._extractGeminiText(data) || '{}';

    const intent = this._parseIntentJSON(content);
    intent._meta = {
      provider: this.providerName,
      model: this.modelName,
      promptVersion: INTENT_EXTRACTION_VERSION,
      latencyMs: Date.now() - startTime,
      tokensUsed: data?.usageMetadata?.totalTokenCount,
    };

    return intent;
  }

  /**
   * Generate a human-friendly response summary.
   */
  async generateResponse(context) {
    const { query, businesses, resultCount } = context;
    const count = resultCount || (businesses || []).length;

    if (count === 0) {
      return `No businesses found matching "${query}". Try different keywords or expand your search area.`;
    }

    const businessNames = (businesses || []).slice(0, 3).map(b => b.name).join(', ');

    try {
      const messages = [
        {
          role: 'system',
          content: 'You are a helpful local business discovery assistant. Write brief (max 20 words), friendly summaries. Use an emoji when appropriate.',
        },
        {
          role: 'user',
          content: `Search: "${query}". Found ${count} business${count !== 1 ? 'es' : ''} including ${businessNames}. Write a 1-sentence friendly summary.`,
        },
      ];

      const response = await this._callGemini(
        this.modelName,
        messages,
        { temperature: 0.5, maxOutputTokens: 80 }
      );

      if (!response.ok) throw new Error('Gemini response generation failed');
      const data = await response.json();
      return this._extractGeminiText(data)?.trim() || this._templateResponse(context);
    } catch {
      return this._templateResponse(context);
    }
  }

  /**
   * Extract menu items from a base64-encoded menu image.
   * Tries all free Gemini vision models in priority order.
   */
  async extractMenuFromImage(imageBase64, options = {}) {
    const mimeType = options.mimeType || 'image/jpeg';
    const currency = options.currency || 'GBP';
    const startTime = Date.now();

    // All free Gemini vision models — tried in order until one succeeds
    const candidates = [
      this.visionModelName,
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-flash-8b',
      'gemini-2.0-flash-lite',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const messages = [
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
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ];

    let lastError = null;

    for (const model of candidates) {
      try {
        console.log(`[Gemini Adapter] Trying vision model: ${model}`);

        const response = await this._callGemini(
          model,
          messages,
          { temperature: 0.1, maxOutputTokens: 4000 },
          60000
        );

        // Rate-limited — try next model
        if (response.status === 429 || response.status === 503) {
          const errText = await response.text();
          console.warn(`[Gemini Adapter] ${model} returned ${response.status} — skipping. ${errText.slice(0, 150)}`);
          lastError = new Error(`${model} HTTP ${response.status}`);
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Menu extraction API error ${response.status}: ${text.slice(0, 300)}`);
        }

        const data = await response.json();
        const rawContent = this._extractGeminiText(data).trim();

        console.log(`[Gemini Adapter] ${model} → content(${rawContent.length}): ${rawContent.slice(0, 300)}`);

        const items = this._parseMenuJSON(rawContent || '[]', currency);
        const latencyMs = Date.now() - startTime;

        console.log(`[Gemini Adapter] extractMenuFromImage: ${items.length} items in ${latencyMs}ms via ${model}`);
        return items;

      } catch (err) {
        console.warn(`[Gemini Adapter] ${model} threw: ${err.message.slice(0, 200)}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Gemini vision model candidates exhausted');
  }

  /**
   * Health check — verify API key works by listing available models.
   */
  async healthCheck() {
    const startTime = Date.now();
    try {
      const response = await this._fetchWithTimeout(
        `${GEMINI_BASE}/models?key=${encodeURIComponent(this.apiKey)}`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
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
}

module.exports = GeminiAdapter;
