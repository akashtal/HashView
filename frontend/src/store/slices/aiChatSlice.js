/**
 * AI Chat Redux Slice
 *
 * Manages the full state for the AI chat panel:
 *  - Messages array (user + assistant turns)
 *  - Streaming state (is AI typing, current streaming token accumulation)
 *  - Inline business results (when a mid-chat new search is triggered)
 *  - Session ID (links chat to the search context)
 *  - UI state (is panel open, suggested follow-ups)
 */

import { createSlice } from '@reduxjs/toolkit';

const MAX_MESSAGES = 40; // Trim oldest messages if conversation grows very long

// Strip SEARCH_TRIGGER directives from display text so they're never shown to user
function cleanDisplayText(text) {
  return text.replace(/\n?SEARCH_TRIGGER:[^\n]*/gi, '').trimEnd();
}

const initialState = {
  // Panel UI
  isOpen: false, // Is the chat slide-up panel visible?

  // Session
  sessionId: null, // Links this chat to search context in Redis

  // Messages
  messages: [], // [{ id, role, content, timestamp, businesses?, suggestedFollowUps?, isStreaming? }]

  // Streaming state
  isStreaming: false, // Is the AI currently generating a response?
  streamBuffer: '', // Accumulates tokens during streaming

  // Suggested follow-up chips
  suggestedFollowUps: [],

  // Error
  error: null,
};

const aiChatSlice = createSlice({
  name: 'aiChat',
  initialState,
  reducers: {
    // ─── Panel Control ──────────────────────────────────────────────────────────
    openChat(state) {
      state.isOpen = true;
    },
    closeChat(state) {
      state.isOpen = false;
    },
    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },

    // ─── Session ────────────────────────────────────────────────────────────────
    setSessionId(state, action) {
      state.sessionId = action.payload;
    },

    // ─── User Message ───────────────────────────────────────────────────────────
    addUserMessage(state, action) {
      const { content, id } = action.payload;
      state.messages.push({
        id: id || `u_${Date.now()}`,
        role: 'user',
        content,
        timestamp: Date.now(),
      });
      state.suggestedFollowUps = [];
      state.error = null;
      // Trim if over limit
      if (state.messages.length > MAX_MESSAGES) {
        state.messages = state.messages.slice(-MAX_MESSAGES);
      }
    },

    // ─── Streaming ──────────────────────────────────────────────────────────────
    startStreaming(state) {
      state.isStreaming = true;
      state.streamBuffer = '';
      state.error = null;
      // Add a placeholder assistant message that will grow as tokens arrive
      state.messages.push({
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      });
    },

    appendToken(state, action) {
      const token = action.payload;
      state.streamBuffer += token;

      // Find the active streaming message (may not be last if biz results were added)
      const streamingIdx = state.messages.findIndex((m) => m.isStreaming);
      if (streamingIdx !== -1) {
        // Strip SEARCH_TRIGGER from displayed content so user never sees it
        state.messages[streamingIdx].content = cleanDisplayText(state.streamBuffer);
      }
    },

    finishStreaming(state, action) {
      const { fullText, suggestedFollowUps, sessionId } = action.payload;
      state.isStreaming = false;
      state.streamBuffer = '';

      if (sessionId) state.sessionId = sessionId;
      if (suggestedFollowUps) state.suggestedFollowUps = suggestedFollowUps;

      // Find the streaming message by searching all messages (it may not be last
      // if inline business result cards were pushed after it)
      const streamingIdx = state.messages.findIndex((m) => m.isStreaming);
      if (streamingIdx !== -1) {
        const msg = state.messages[streamingIdx];
        // Use the server-provided fullText (already SEARCH_TRIGGER-clean) if available
        msg.content = fullText || cleanDisplayText(msg.content);
        msg.isStreaming = false;
        if (suggestedFollowUps) msg.suggestedFollowUps = suggestedFollowUps;
      }

      // Trim if over limit
      if (state.messages.length > MAX_MESSAGES) {
        state.messages = state.messages.slice(-MAX_MESSAGES);
      }
    },

    // ─── Mid-chat Business Results ──────────────────────────────────────────────
    addSearchingIndicator(state, action) {
      state.messages.push({
        id: `search_${Date.now()}`,
        role: 'assistant',
        content: `Searching for "${action.payload}"...`,
        timestamp: Date.now(),
        isSearching: true,
      });
    },

    addInlineBusinessResults(state, action) {
      const { businesses, totalCount, query } = action.payload;

      // Remove the "searching..." indicator if present
      state.messages = state.messages.filter((m) => !m.isSearching);

      // Add a special business-results message
      state.messages.push({
        id: `biz_${Date.now()}`,
        role: 'assistant',
        content: `Found ${totalCount} results for "${query}"`,
        timestamp: Date.now(),
        businesses,
        isBizResults: true,
      });
    },

    // ─── Error ──────────────────────────────────────────────────────────────────
    setChatError(state, action) {
      state.isStreaming = false;
      state.error = action.payload;

      // Remove any incomplete streaming message
      state.messages = state.messages.filter((m) => !m.isStreaming);

      // Add error message to chat
      state.messages.push({
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: '⚠️ Sorry, I ran into an issue. Please try again.',
        timestamp: Date.now(),
        isError: true,
      });
    },

    // ─── Clear ──────────────────────────────────────────────────────────────────
    clearChat(state) {
      state.messages = [];
      state.streamBuffer = '';
      state.isStreaming = false;
      state.suggestedFollowUps = [];
      state.error = null;
      // Note: we keep sessionId so the server session can be reused for context
    },

    clearAndResetSession(state) {
      return {
        ...initialState,
        isOpen: state.isOpen,
      };
    },
  },
});

export const {
  openChat,
  closeChat,
  toggleChat,
  setSessionId,
  addUserMessage,
  startStreaming,
  appendToken,
  finishStreaming,
  addSearchingIndicator,
  addInlineBusinessResults,
  setChatError,
  clearChat,
  clearAndResetSession,
} = aiChatSlice.actions;

// ─── Selectors ─────────────────────────────────────────────────────────────────

export const selectChatIsOpen = (state) => state.aiChat.isOpen;
export const selectChatMessages = (state) => state.aiChat.messages;
export const selectChatIsStreaming = (state) => state.aiChat.isStreaming;
export const selectChatSessionId = (state) => state.aiChat.sessionId;
export const selectChatFollowUps = (state) => state.aiChat.suggestedFollowUps;
export const selectChatError = (state) => state.aiChat.error;

export default aiChatSlice.reducer;
