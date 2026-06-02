/**
 * Groq Provider Adapter
 *
 * Groq is 100% FREE — no billing, no credit card needed.
 * Sign up at https://console.groq.com and get a key instantly.
 *
 * ─── Free Tier ────────────────────────────────────────────────────────────────
 *   14,400 requests/day free
 *   Extremely fast inference (1000+ tokens/second)
 *
 * ─── Models ──────────────────────────────────────────────────────────────────
 *   Text: llama-3.3-70b-versatile, llama-3.1-8b-instant
 *   Vision: meta-llama/llama-4-scout-17b-16e-instruct (Llama 4 with vision ✓)
 *
 * ─── Endpoint ────────────────────────────────────────────────────────────────
 *   https://api.groq.com/openai/v1  (100% OpenAI-compatible)
 *   Authorization: Bearer gsk_xxx
 */

const OpenAIAdapter = require('./openai.adapter');
const { INTENT_EXTRACTION_SYSTEM_PROMPT, INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');
const { MENU_EXTRACTION_SYSTEM_PROMPT } = require('../prompts/menu_extraction_v1');

class GroqAdapter extends OpenAIAdapter {
  constructor(config = {}) {
    super({
      apiKey:      config.apiKey      || '',
      model:       config.model       || 'llama-3.3-70b-versatile',
      visionModel: config.visionModel || 'meta-llama/llama-4-scout-17b-16e-instruct',
      baseUrl:     config.baseUrl     || 'https://api.groq.com/openai/v1',
      timeout:     config.timeout     || 30000,
    });
    this.providerName = 'groq';
  }

  /**
   * Extract intent — override to remove response_format (not supported on Groq).
   */
  async extractIntent(query, options = {}) {
    const systemPrompt = options.systemPrompt || INTENT_EXTRACTION_SYSTEM_PROMPT;
    const startTime = Date.now();

    const response = await this._fetchWithTimeout(
      `${this.baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelName,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user',   content: query },
          ],
          temperature: 0.1,
          max_tokens: 400,
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Groq API error ${response.status}: ${text.slice(0, 200)}`);
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
   * Extract menu items from image — uses Groq's Llama 4 vision models.
   */
  async extractMenuFromImage(imageBase64, options = {}) {
    const mimeType = options.mimeType || 'image/jpeg';
    const currency = options.currency || 'GBP';
    const startTime = Date.now();

    // Groq vision-capable models — tried in order
    const candidates = [
      this.visionModelName,
      'meta-llama/llama-4-scout-17b-16e-instruct',
      'meta-llama/llama-4-maverick-17b-128e-instruct',
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    const buildMessages = () => ([
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
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`,
            },
          },
        ],
      },
    ]);

    let lastError = null;

    for (const model of candidates) {
      try {
        console.log(`[Groq Adapter] Trying vision model: ${model}`);

        const response = await this._fetchWithTimeout(
          `${this.baseUrl}/chat/completions`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: buildMessages(),
              temperature: 0.1,
              max_tokens: 4000,
            }),
          },
          60000
        );

        if (response.status === 429 || response.status === 503) {
          const errText = await response.text();
          console.warn(`[Groq Adapter] ${model} returned ${response.status} — skipping.`);
          lastError = new Error(`${model} HTTP ${response.status}`);
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Groq API error ${response.status}: ${text.slice(0, 300)}`);
        }

        const data = await response.json();
        const rawContent = (data?.choices?.[0]?.message?.content || '').trim();

        console.log(`[Groq Adapter] ${model} → content(${rawContent.length}): ${rawContent.slice(0, 300)}`);

        const items = this._parseMenuJSON(rawContent || '[]', currency);
        console.log(`[Groq Adapter] extractMenuFromImage: ${items.length} items in ${Date.now() - startTime}ms via ${model}`);
        return items;

      } catch (err) {
        console.warn(`[Groq Adapter] ${model} threw: ${err.message.slice(0, 150)}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All Groq vision model candidates exhausted');
  }

  async healthCheck() {
    const startTime = Date.now();
    try {
      const response = await this._fetchWithTimeout(
        `${this.baseUrl}/models`,
        { method: 'GET', headers: { 'Authorization': `Bearer ${this.apiKey}` } },
        5000
      );
      return { healthy: response.ok, latencyMs: Date.now() - startTime, provider: this.providerName, model: this.modelName };
    } catch (err) {
      return { healthy: false, latencyMs: Date.now() - startTime, provider: this.providerName, model: this.modelName, error: err.message };
    }
  }
}

module.exports = GroqAdapter;
