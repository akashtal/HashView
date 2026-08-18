/**
 * AI Chat Engine — LangChain + Streaming (v2)
 *
 * Updated to use chat_system_v2.js (strict anti-hallucination prompt)
 * and removed SEARCH_TRIGGER mechanic (context_loader + chat.route.js handle
 * new search needs directly).
 *
 * Streaming delivery:
 *   Tokens are emitted via onToken → route handler → SSE → frontend renders
 *   progressively like ChatGPT.
 *
 * Fallback chain:
 *   1. Groq (openai/gpt-oss-120b) — primary
 *   2. Gemini (gemini-2.0-flash) — fallback if Groq fails
 *   3. Template response — if all providers fail
 */

const { ChatGroq } = require('@langchain/groq');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');

const settings = require('../config/settings');
const { buildChatSystemPrompt } = require('../prompts/chat_system_v2');

// ─── Build LangChain Model ────────────────────────────────────────────────────

function buildChatModel(streaming = true) {
  // Primary: Groq
  if (settings.groq?.apiKey) {
    return new ChatGroq({
      apiKey: settings.groq.apiKey,
      model: settings.groq.model || 'openai/gpt-oss-120b',
      temperature: 0.3,  // Lowered from 0.6 to reduce hallucination risk
      maxTokens: 800,  // Increased from 600 for richer comparison answers
      streaming,
    });
  }

  return null;
}

function buildFallbackModel(streaming = true) {
  // Fallback: Gemini via OpenAI-compatible API
  if (settings.gemini?.apiKey) {
    try {
      const { ChatOpenAI } = require('@langchain/openai');
      return new ChatOpenAI({
        apiKey: settings.gemini.apiKey,
        model: settings.gemini.model || 'gemini-2.0-flash',
        baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        temperature: 0.3,
        maxTokens: 800,
        streaming,
      });
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Build Message Array ──────────────────────────────────────────────────────

/**
 * Build the LangChain message array from session history + context.
 * Uses the v2 system prompt (database-grounded).
 */
function buildMessages(userMessage, history, contextText, contextType, session, location) {
  const messages = [];

  // System prompt — uses v2 (strict anti-hallucination)
  const systemContent = buildChatSystemPrompt(contextText, contextType, session, location);
  messages.push(new SystemMessage(systemContent));

  // Conversation history (last N turns)
  for (const msg of history) {
    if (msg.role === 'user') {
      messages.push(new HumanMessage(msg.content));
    } else if (msg.role === 'assistant') {
      messages.push(new AIMessage(msg.content));
    }
  }

  // Current user message
  messages.push(new HumanMessage(userMessage));

  return messages;
}

// ─── Follow-Up Suggestion Generator ──────────────────────────────────────────

function generateSuggestedFollowUps(contextType, assistantResponse, hasComparison = false) {
  if (hasComparison) {
    return ['Which one should I visit first?', 'What are the prices at both?', 'Which has better reviews?'];
  }

  switch (contextType) {
    case 'business_menu':
    case 'business_menu_reviews':
      return ['What do reviews say?', 'Is anything halal or vegan?', 'Are they open now?'];

    case 'business_reviews':
      return ["What's on the menu?", 'What are the prices?', 'How far is it?'];

    case 'comparison':
      return ['Which one should I visit?', 'What are the price differences?', 'Which has better reviews?'];

    case 'search_results':
      return ['Tell me more about the first one', 'Which has the best reviews?', 'Compare the first and second'];

    case 'menu_search':
      return ['Which is cheapest?', 'Any halal/vegan options?', 'Tell me about the top result'];

    case 'business':
      return ['Show me the menu', 'What do people say?', 'Are they open now?'];

    default:
      return ['Find restaurants near me', 'Show me top rated cafes', 'Any deals nearby?'];
  }
}

// ─── Main: Stream Chat Response ───────────────────────────────────────────────

/**
 * Stream a chat response using LangChain.
 *
 * @param {Object} params
 * @param {string}   params.userMessage   - The user's current message
 * @param {Array}    params.history       - Recent conversation history [{ role, content }]
 * @param {string}   params.contextText   - RAG context string from context_loader.js
 * @param {string}   params.contextType   - Type of context loaded
 * @param {Object}   params.session       - Current session (for system prompt building)
 * @param {Object}   [params.location]    - { latitude, longitude }
 * @param {Function} params.onToken       - Called for each streamed token: onToken(token)
 * @param {Function} params.onDone        - Called when complete: onDone({ fullText, suggestedFollowUps })
 * @param {Function} params.onError       - Called on error: onError(err)
 */
async function streamChatResponse({
  userMessage,
  history,
  contextText,
  contextType,
  session,
  location,
  onToken,
  onDone,
  onError,
}) {
  // Try primary model first, then fallback
  let model = buildChatModel(true);
  if (!model) {
    model = buildFallbackModel(true);
  }

  if (!model) {
    const fallback = "I'm currently unable to process chat requests. Please use the search bar to find businesses near you.";
    onToken(fallback);
    onDone({
      fullText: fallback,
      suggestedFollowUps: ['Find restaurants near me', 'Search for cafes', 'Show halal food'],
    });
    return;
  }

  const messages = buildMessages(userMessage, history, contextText, contextType, session, location);
  const isComparison = contextType === 'comparison';

  try {
    let fullText = '';

    // Try streaming
    try {
      const stream = await model.stream(messages);
      for await (const chunk of stream) {
        const token = chunk.content;
        if (token) {
          fullText += token;
          onToken(token);
        }
      }
    } catch (streamErr) {
      // If streaming fails, try non-streaming fallback
      console.warn('[Chat Engine] Streaming failed, trying non-streaming:', streamErr.message);
      const nonStreamModel = buildChatModel(false) || buildFallbackModel(false);
      if (nonStreamModel) {
        const response = await nonStreamModel.invoke(messages);
        fullText = typeof response.content === 'string' ? response.content : '';
        onToken(fullText); // Send all at once
      } else {
        throw streamErr;
      }
    }

    const suggestedFollowUps = generateSuggestedFollowUps(contextType, fullText, isComparison);
    onDone({ fullText, suggestedFollowUps });

  } catch (err) {
    console.error('[Chat Engine] Error:', err.message);
    onError(err);
  }
}

/**
 * Non-streaming fallback for testing.
 */
async function getChatResponse({ userMessage, history, contextText, contextType, session, location }) {
  const model = buildChatModel(false) || buildFallbackModel(false);
  if (!model) {
    return {
      fullText: 'AI chat is temporarily unavailable. Please use the search bar.',
      suggestedFollowUps: ['Find restaurants near me'],
    };
  }

  const messages = buildMessages(userMessage, history, contextText, contextType, session, location);
  const response = await model.invoke(messages);
  const fullText = typeof response.content === 'string' ? response.content : '';

  return {
    fullText,
    suggestedFollowUps: generateSuggestedFollowUps(contextType, fullText),
  };
}

module.exports = { streamChatResponse, getChatResponse };
