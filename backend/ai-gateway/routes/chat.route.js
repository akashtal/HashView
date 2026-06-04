/**
 * AI Gateway — Chat Route
 * POST /ai/chat
 * GET  /ai/chat/:sessionId  (fetch history)
 * DELETE /ai/chat/:sessionId (clear session)
 *
 * Streaming: Uses Server-Sent Events (SSE).
 * The client receives tokens one-by-one as the AI generates them.
 *
 * SSE event format:
 *   data: {"type":"token","token":"Hello"}\n\n
 *   data: {"type":"done","fullText":"...","sessionId":"...","suggestedFollowUps":[]}\n\n
 *   data: {"type":"businesses","businesses":[...]}\n\n   (when a new search is triggered)
 *   data: {"type":"error","error":"..."}\n\n
 *
 * New search mid-chat:
 *   If the AI response contains SEARCH_TRIGGER:{query}, this route runs
 *   the full AI search pipeline and streams business results back alongside
 *   the chat response.
 */

const express  = require('express');
const router   = express.Router();
const mongoose = require('mongoose');

const {
  getSession, saveSession, deleteSession,
  createSession, appendMessage, getRecentHistory,
  focusBusiness, updateSearchContext,
} = require('../pipeline/session_manager');

const { loadContext }         = require('../pipeline/context_loader');
const { streamChatResponse }  = require('../pipeline/chat_engine');

// Lazy-load the search pipeline for mid-chat new searches
function getSearchPipeline() {
  return {
    buildQuery:      require('../pipeline/query_builder').buildQuery,
    executeQuery:    require('../pipeline/retriever').executeQuery,
    rankResults:     require('../pipeline/ranker').rankResults,
    parseIntent:     require('../pipeline/intent_parser').parseIntent,
  };
}

// ─── POST /ai/chat — Send a message (streaming SSE) ──────────────────────────

router.post('/', async (req, res) => {
  const {
    message,
    sessionId,
    latitude,
    longitude,
    // Context hints passed from the search screen
    searchBusinessIds,  // IDs of businesses from the last search
    searchQuery,        // The original search query
    searchIntent,       // The extracted intent from the last search
  } = req.body;

  const userId = req.user?._id?.toString() || null;

  // ─── Validate ─────────────────────────────────────────────────────────────
  if (!message || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Message is required' });
  }
  if (message.length > 500) {
    return res.status(400).json({ success: false, error: 'Message too long (max 500 characters)' });
  }

  // ─── Setup SSE ────────────────────────────────────────────────────────────
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable Nginx buffering for streaming
  res.flushHeaders();

  const send = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
  };

  const location = (latitude && longitude)
    ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    : null;

  try {
    // ─── Load or create session ─────────────────────────────────────────────
    let session = sessionId ? await getSession(sessionId) : null;
    const activeSessionId = sessionId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!session) {
      session = createSession({ userId, location });
    }

    // ─── Inject search context if provided ─────────────────────────────────
    // (Happens when the user opens chat right after a search)
    if (searchBusinessIds?.length > 0 && session.messages.length === 0) {
      session = updateSearchContext(session, {
        businessIds: searchBusinessIds,
        query:       searchQuery || '',
        intent:      searchIntent || null,
      });
      if (location) session.location = location;
    }

    // ─── Load RAG context ──────────────────────────────────────────────────
    const { contextText, contextType, needsNewSearch, updatedSession } =
      await loadContext(message.trim(), session, location);

    session = updatedSession;

    // ─── Append user message to history ───────────────────────────────────
    session = appendMessage(session, 'user', message.trim());

    // ─── Get recent history for LangChain (excluding the message just added) ──
    const history = getRecentHistory(session, 8).slice(0, -1); // exclude last (current user msg)

    // ─── Stream the AI response ────────────────────────────────────────────
    let fullAssistantText = '';
    let searchWasTriggered = false;

    await streamChatResponse({
      userMessage:  message.trim(),
      history,
      contextText,
      contextType,
      onToken: (token) => {
        send({ type: 'token', token });
        fullAssistantText += token;
      },
      onDone: async ({ fullText, searchQuery: newSearchQuery, suggestedFollowUps }) => {
        fullAssistantText = fullText;

        // ─── Handle new search trigger ─────────────────────────────────
        let newBusinesses = null;
        if (newSearchQuery && !searchWasTriggered) {
          searchWasTriggered = true;
          try {
            send({ type: 'searching', query: newSearchQuery });

            const { parseIntent, buildQuery, executeQuery, rankResults } = getSearchPipeline();
            const intentResult = await parseIntent(newSearchQuery);
            const pipeline     = buildQuery(intentResult.intent, location, { limit: 6, page: 1 });
            const { businesses, totalCount } = await executeQuery(pipeline);
            const ranked = rankResults(businesses, intentResult.intent, location);

            newBusinesses = ranked.slice(0, 6).map(cleanBusinessForChat);

            // Update session with new search context
            session = updateSearchContext(session, {
              businessIds: newBusinesses.map(b => b._id),
              query:       newSearchQuery,
              intent:      intentResult.intent,
            });

            send({ type: 'businesses', businesses: newBusinesses, totalCount, query: newSearchQuery });
          } catch (searchErr) {
            console.warn('[Chat Route] Mid-chat search failed:', searchErr.message);
          }
        }

        // ─── Save assistant message ───────────────────────────────────
        session = appendMessage(session, 'assistant', fullText, {
          suggestedFollowUps,
          contextType,
          businessIds: newBusinesses?.map(b => b._id),
        });

        await saveSession(activeSessionId, session);

        // ─── Send done event ──────────────────────────────────────────
        send({
          type: 'done',
          sessionId: activeSessionId,
          fullText,
          suggestedFollowUps,
          contextType,
        });

        res.end();
      },
      onError: async (err) => {
        send({ type: 'error', error: 'AI chat encountered an error. Please try again.' });
        res.end();
      },
    });

  } catch (err) {
    console.error('[Chat Route] Unhandled error:', err);
    send({ type: 'error', error: 'Chat temporarily unavailable. Please try again.' });
    res.end();
  }
});

// ─── GET /ai/chat/:sessionId — Fetch chat history ────────────────────────────

router.get('/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const session = await getSession(sessionId);

  if (!session) {
    return res.status(404).json({ success: false, error: 'Session not found or expired' });
  }

  res.json({
    success:  true,
    sessionId,
    messages: session.messages,
    focusedBusinessId:   session.focusedBusinessId,
    focusedBusinessName: session.focusedBusinessName,
  });
});

// ─── DELETE /ai/chat/:sessionId — Clear session ───────────────────────────────

router.delete('/:sessionId', async (req, res) => {
  await deleteSession(req.params.sessionId);
  res.json({ success: true, message: 'Chat session cleared' });
});

// ─── Private Helpers ──────────────────────────────────────────────────────────

function cleanBusinessForChat(biz) {
  return {
    _id:        biz._id,
    name:       biz.name,
    category:   biz.category,
    rating:     biz.rating,
    address:    biz.address,
    logo:       biz.logo,
    coverImage: biz.coverImage,
    distanceKm: biz._distance ? Math.round(biz._distance / 100) / 10 : null,
    hasActiveDeals: (biz._coupons || []).length > 0,
    matchingMenuItems: (biz._menuItems || []).slice(0, 2).map(i => ({
      name:     i.name,
      price:    i.price,
      currency: i.currency || 'GBP',
    })),
  };
}

module.exports = router;
