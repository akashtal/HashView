/**
 * HuggingFace Inference Provider Adapter
 *
 * Uses HuggingFace's OpenAI-compatible serverless inference endpoint.
 * Completely FREE — no billing, no credit card. Just a free HF account token.
 *
 * ─── Setup ───────────────────────────────────────────────────────────────────
 *   1. Create a free account at https://huggingface.co
 *   2. Go to https://huggingface.co/settings/tokens → New token (Read type)
 *   3. Set in .env:
 *        AI_PRIMARY_PROVIDER=huggingface
 *        AI_HF_API_KEY=hf_xxx
 *
 * ─── Free Vision Models ───────────────────────────────────────────────────────
 *   Qwen/Qwen2.5-VL-7B-Instruct       → excellent at OCR + document reading ✓
 *   meta-llama/Llama-3.2-11B-Vision   → strong general vision ✓
 *   Qwen/Qwen2.5-VL-3B-Instruct       → smaller, faster ✓
 *
 * ─── Endpoint ────────────────────────────────────────────────────────────────
 *   https://api-inference.huggingface.co/v1  (OpenAI-compatible format)
 *   Authentication: Authorization: Bearer hf_xxx
 */

const OpenAIAdapter = require('./openai.adapter');
const { INTENT_EXTRACTION_SYSTEM_PROMPT, INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');
const { MENU_EXTRACTION_SYSTEM_PROMPT } = require('../prompts/menu_extraction_v1');

class HuggingFaceAdapter extends OpenAIAdapter {
  constructor(config = {}) {
    super({
      apiKey:      config.apiKey      || '',
      model:       config.model       || 'meta-llama/Meta-Llama-3.1-8B-Instruct',
      visionModel: config.visionModel || 'Qwen/Qwen2.5-VL-7B-Instruct',
      baseUrl:     config.baseUrl     || 'https://api-inference.huggingface.co/v1',
      timeout:     config.timeout     || 60000, // HF cold-starts can be slow
    });
    this.providerName = 'huggingface';
  }

  /**
   * Extract intent — HuggingFace does not support response_format: json_object,
   * so we override to remove it and rely on the prompt + _parseIntentJSON.
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
          // Note: response_format: json_object not supported on HF models
        }),
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HuggingFace API error ${response.status}: ${text.slice(0, 200)}`);
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
   * Extract menu items from an image.
   * Uses HuggingFace-hosted vision models with fallover between them.
   */
  async extractMenuFromImage(imageBase64, options = {}) {
    const mimeType = options.mimeType || 'image/jpeg';
    const currency = options.currency || 'GBP';
    const startTime = Date.now();

    // Free HuggingFace vision models — tried in order
    const candidates = [
      this.visionModelName,
      'Qwen/Qwen2.5-VL-7B-Instruct',
      'meta-llama/Llama-3.2-11B-Vision-Instruct',
      'Qwen/Qwen2.5-VL-3B-Instruct',
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
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ]);

    let lastError = null;

    for (const model of candidates) {
      try {
        console.log(`[HuggingFace Adapter] Trying vision model: ${model}`);

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
          90000 // 90s — HF models may cold-start
        );

        // Rate-limited or model loading — try next
        if (response.status === 429 || response.status === 503) {
          const errText = await response.text();
          console.warn(`[HuggingFace Adapter] ${model} returned ${response.status} — skipping.`);
          lastError = new Error(`${model} HTTP ${response.status}`);
          continue;
        }

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HF API error ${response.status}: ${text.slice(0, 200)}`);
        }

        const data = await response.json();
        const rawContent = (data?.choices?.[0]?.message?.content || '').trim();

        console.log(`[HuggingFace Adapter] ${model} → content(${rawContent.length}): ${rawContent.slice(0, 300)}`);

        const items = this._parseMenuJSON(rawContent || '[]', currency);
        const latencyMs = Date.now() - startTime;

        console.log(`[HuggingFace Adapter] extractMenuFromImage: ${items.length} items in ${latencyMs}ms via ${model}`);
        return items;

      } catch (err) {
        console.warn(`[HuggingFace Adapter] ${model} threw: ${err.message.slice(0, 150)}`);
        lastError = err;
      }
    }

    throw lastError || new Error('All HuggingFace vision model candidates exhausted');
  }

  /**
   * Health check.
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
      return { healthy: false, latencyMs: Date.now() - startTime, provider: this.providerName, model: this.modelName, error: err.message };
    }
  }
}

module.exports = HuggingFaceAdapter;
