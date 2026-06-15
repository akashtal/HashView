/**
 * AI Chat Service
 *
 * Handles the SSE streaming connection to POST /ai/chat.
 *
 * Streaming approach:
 *   React Native's fetch API (with Hermes engine) supports body streaming
 *   via response.body.getReader(). We read chunks, parse the SSE format,
 *   and dispatch Redux actions for each event type.
 *
 * SSE event types (from the backend):
 *   { type: 'token',      token: '...' }          → word-by-word token
 *   { type: 'searching',  query: '...' }           → mid-chat new search started
 *   { type: 'businesses', businesses: [], ... }    → new search results
 *   { type: 'done',       fullText, sessionId, suggestedFollowUps }
 *   { type: 'error',      error: '...' }
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api.config';

// Derive AI base URL from API base (strips /api, adds /ai)
const AI_BASE_URL = API_CONFIG.BASE_URL.replace(/\/api\/?$/, '/ai');

/**
 * Stream a chat message to the AI and dispatch Redux actions as events arrive.
 *
 * @param {Object} params
 * @param {string}   params.message              - User's message
 * @param {string}   [params.sessionId]          - Existing session ID
 * @param {number}   [params.latitude]
 * @param {number}   [params.longitude]
 * @param {string[]} [params.searchBusinessIds]  - Business IDs from last search
 * @param {string}   [params.searchQuery]        - Last search query string
 * @param {Object}   [params.searchIntent]       - Last search extracted intent
 * @param {Function} params.onToken              - Called for each token: (token) => void
 * @param {Function} params.onSearching          - Called when mid-chat search starts: (query) => void
 * @param {Function} params.onBusinessResults    - Called with new search results: ({ businesses, totalCount, query }) => void
 * @param {Function} params.onDone               - Called when response is complete: ({ fullText, sessionId, suggestedFollowUps }) => void
 * @param {Function} params.onError              - Called on error: (message) => void
 * @returns {Function} abort - Call to cancel the stream
 */
async function streamChat({
  message,
  sessionId,
  latitude,
  longitude,
  searchBusinessIds,
  searchQuery,
  searchIntent,
  onToken,
  onSearching,
  onBusinessResults,
  onDone,
  onError,
}) {
  let xhr = new XMLHttpRequest();
  let processedLength = 0;
  let buffer = '';
  let isAborted = false;

  try {
    const token = await AsyncStorage.getItem('token');

    xhr.open('POST', `${AI_BASE_URL}/chat`, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', token ? `Bearer ${token}` : '');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.setRequestHeader('Cache-Control', 'no-cache');

    xhr.onreadystatechange = () => {
      if (isAborted) return;

      // When we start receiving data or when done
      if (xhr.readyState === 3 || xhr.readyState === 4) {
        // Check for HTTP errors
        if (xhr.status >= 400) {
          let errMessage = `Server error ${xhr.status}`;
          try {
            const errData = JSON.parse(xhr.responseText);
            errMessage = errData.error || errMessage;
          } catch {}
          onError(errMessage);
          isAborted = true;
          xhr.abort();
          return;
        }

        const responseText = xhr.responseText || '';
        if (responseText.length > processedLength) {
          const chunk = responseText.slice(processedLength);
          processedLength = responseText.length;

          buffer += chunk;
          const events = buffer.split('\n\n');
          buffer = events.pop(); // Keep incomplete event in buffer

          for (const eventBlock of events) {
            const line = eventBlock.trim();
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              handleSSEEvent(event, { onToken, onSearching, onBusinessResults, onDone, onError });
            } catch (err) {
              // Malformed JSON — skip
            }
          }
        }
      }

      if (xhr.readyState === 4) {
        // Handle final buffer content if any (fallback)
        if (buffer.trim()) {
          const line = buffer.trim();
          if (line.startsWith('data: ')) {
            try {
              const event = JSON.parse(line.slice(6));
              handleSSEEvent(event, { onToken, onSearching, onBusinessResults, onDone, onError });
            } catch {}
          }
        }
      }
    };

    xhr.onerror = (err) => {
      if (isAborted) return;
      onError('Chat connection failed. Please check your connection.');
    };

    xhr.send(
      JSON.stringify({
        message,
        sessionId,
        latitude,
        longitude,
        searchBusinessIds,
        searchQuery,
        searchIntent,
      })
    );
  } catch (err) {
    if (isAborted) return () => {};
    onError(err.message || 'Chat connection failed. Please check your connection.');
  }

  // Return abort function so the caller can cancel mid-stream
  return () => {
    isAborted = true;
    try {
      xhr.abort();
    } catch {}
  };
}

function handleSSEEvent(event, { onToken, onSearching, onBusinessResults, onDone, onError }) {
  switch (event.type) {
    case 'token':
      onToken?.(event.token);
      break;

    case 'searching':
      onSearching?.(event.query);
      break;

    case 'businesses':
      onBusinessResults?.({
        businesses: event.businesses || [],
        totalCount: event.totalCount || 0,
        query: event.query || '',
      });
      break;

    case 'done':
      onDone?.({
        fullText: event.fullText || '',
        sessionId: event.sessionId,
        suggestedFollowUps: event.suggestedFollowUps || [],
      });
      break;

    case 'error':
      onError?.(event.error || 'AI chat error');
      break;

    default:
      break;
  }
}

/**
 * Clear a chat session on the server.
 */
async function clearSession(sessionId) {
  if (!sessionId) return;
  try {
    const token = await AsyncStorage.getItem('token');
    await fetch(`${AI_BASE_URL}/chat/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: token ? `Bearer ${token}` : '' },
    });
  } catch {
    /* non-fatal */
  }
}

const AIChatService = { streamChat, clearSession };
export default AIChatService;
