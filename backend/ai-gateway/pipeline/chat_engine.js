/**
 * AI Chat Engine — LangChain + Streaming
 *
 * Uses LangChain's ChatGroq (or any OpenAI-compatible provider) with
 * streaming enabled so tokens arrive word-by-word in real time.
 *
 * Streaming delivery:
 *   Tokens are emitted via the `onToken` callback → the route handler
 *   writes them to the SSE response stream → the frontend renders them
 *   progressively, like ChatGPT.
 *
 * New search detection:
 *   If the AI's full response contains SEARCH_TRIGGER:{query}, the engine
 *   extracts the query, runs the existing AI search pipeline, and returns
 *   the results alongside the chat response.
 */

const { ChatGroq }   = require('@langchain/groq');
const { HumanMessage, SystemMessage, AIMessage } = require('@langchain/core/messages');

const settings = require('../config/settings');
const { CHAT_SYSTEM_PROMPT } = require('../prompts/chat_system_v1');

// ─── Build LangChain model ────────────────────────────────────────────────────

function buildChatModel(streaming = true) {
  // Primary: use Groq if configured
  if (settings.groq?.apiKey) {
    return new ChatGroq({
      apiKey:      settings.groq.apiKey,
      model:       settings.groq.model || 'llama-3.3-70b-versatile',
      temperature: 0.6,
      maxTokens:   600,
      streaming,
    });
  }

  // Fallback: try OpenAI-compatible (Gemini, HF, etc.) via raw fetch
  // The chat route falls back to non-streaming in this case
  return null;
}

// ─── Format LangChain Messages ────────────────────────────────────────────────

/**
 * Build the message array for LangChain from session history + context.
 */
function buildMessages(userMessage, history, contextText) {
  const messages = [];

  // System prompt — always first
  let systemContent = CHAT_SYSTEM_PROMPT;
  if (contextText) {
    systemContent += `\n\n──────────────────────────────\nCURRENT CONTEXT (use this data to answer):\n${contextText}\n──────────────────────────────`;
  }
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

// ─── Suggested Follow-Up Generator ───────────────────────────────────────────

function generateSuggestedFollowUps(contextType, assistantResponse) {
  const suggestions = [];

  if (contextType === 'business_menu' || contextType === 'business_menu_reviews') {
    suggestions.push("What do reviews say?", "Is anything halal/vegan?", "How far is it from me?");
  } else if (contextType === 'business_reviews') {
    suggestions.push("What's on the menu?", "What are the prices?", "What are the opening hours?");
  } else if (contextType === 'search_results') {
    suggestions.push("Tell me more about the first one", "Which has the best reviews?", "Show me cheaper options");
  } else if (contextType === 'business') {
    suggestions.push("Show me the menu", "What do people say about it?", "Are they open now?");
  } else {
    suggestions.push("Find restaurants near me", "Show me top rated cafes", "Any deals nearby?");
  }

  // Trim to 3 and ensure they're short
  return suggestions.slice(0, 3);
}

// ─── Search Trigger Extractor ─────────────────────────────────────────────────

/**
 * Check if the AI response contains a SEARCH_TRIGGER directive.
 * Returns { cleanText, searchQuery } — cleanText has the trigger removed.
 */
function extractSearchTrigger(text) {
  const triggerMatch = text.match(/SEARCH_TRIGGER:([^\n]+)/i);
  if (!triggerMatch) return { cleanText: text, searchQuery: null };

  const searchQuery = triggerMatch[1].trim();
  const cleanText   = text.replace(/SEARCH_TRIGGER:[^\n]+/i, '').trim();
  return { cleanText, searchQuery };
}

// ─── Main: Stream Chat Response ───────────────────────────────────────────────

/**
 * Stream a chat response using LangChain + Groq.
 *
 * @param {Object} params
 * @param {string}   params.userMessage    - The user's current message
 * @param {Array}    params.history        - Recent conversation history [{ role, content }]
 * @param {string}   params.contextText    - RAG context string injected into prompt
 * @param {string}   params.contextType    - What context was loaded (for follow-up suggestions)
 * @param {Function} params.onToken        - Callback called for each streamed token: onToken(token)
 * @param {Function} params.onDone         - Callback called when streaming completes: onDone({ fullText, searchQuery, suggestedFollowUps })
 * @param {Function} params.onError        - Callback called on error: onError(err)
 */
async function streamChatResponse({
  userMessage,
  history,
  contextText,
  contextType,
  onToken,
  onDone,
  onError,
}) {
  const model = buildChatModel(true);

  if (!model) {
    // No streaming provider configured — fall back to template response
    const fallback = "I'm currently unable to process chat requests. Please try the search bar to find businesses near you.";
    onToken(fallback);
    onDone({
      fullText:           fallback,
      searchQuery:        null,
      suggestedFollowUps: ["Find restaurants near me", "Search for cafes", "Show halal food"],
    });
    return;
  }

  const messages = buildMessages(userMessage, history, contextText);

  try {
    let fullText = '';

    const stream = await model.stream(messages);

    for await (const chunk of stream) {
      const token = chunk.content;
      if (token) {
        fullText += token;
        onToken(token);
      }
    }

    // Post-process: extract search trigger if present
    const { cleanText, searchQuery } = extractSearchTrigger(fullText);
    const suggestedFollowUps = generateSuggestedFollowUps(contextType, cleanText);

    onDone({ fullText: cleanText, searchQuery, suggestedFollowUps });

  } catch (err) {
    console.error('[Chat Engine] Streaming error:', err.message);
    onError(err);
  }
}

/**
 * Non-streaming fallback (for testing or when streaming isn't needed).
 */
async function getChatResponse({ userMessage, history, contextText, contextType }) {
  const model = buildChatModel(false);
  if (!model) {
    return {
      fullText:           'AI chat is temporarily unavailable. Please use the search bar.',
      searchQuery:        null,
      suggestedFollowUps: ['Find restaurants near me'],
    };
  }

  const messages = buildMessages(userMessage, history, contextText);
  const response  = await model.invoke(messages);
  const text       = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

  const { cleanText, searchQuery } = extractSearchTrigger(text);
  return {
    fullText:           cleanText,
    searchQuery,
    suggestedFollowUps: generateSuggestedFollowUps(contextType, cleanText),
  };
}

module.exports = { streamChatResponse, getChatResponse };
