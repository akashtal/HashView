/**
 * AI Gateway — Chat Route (v2)
 * POST /ai/chat
 * GET  /ai/chat/:sessionId
 * DELETE /ai/chat/:sessionId
 *
 * Streaming via Server-Sent Events (SSE).
 *
 * Key upgrades from v1:
 *  - Accepts `rankedBusinessList` from the frontend (full ranked list with positions)
 *  - Ordinal resolution step before context loading
 *  - Cumulative intent merging (filters stack across turns)
 *  - Comparison mode detection
 *  - Removed SEARCH_TRIGGER mechanic (context_loader now handles new search detection)
 *  - Uses chat_engine v2 with strict system prompt
 *
 * SSE event format:
 *   data: {"type":"token","token":"Hello"}\n\n
 *   data: {"type":"done","fullText":"...","sessionId":"...","suggestedFollowUps":[]}\n\n
 *   data: {"type":"businesses","businesses":[...]}\n\n  (when context_loader triggers new search)
 *   data: {"type":"error","error":"..."}\n\n
 */

const express  = require('express');
const router   = express.Router();

const {
  getSession, saveSession, deleteSession,
  createSession, appendMessage, getRecentHistory,
  focusBusiness, updateSearchContext, mergeCumulativeIntent,
  detectOrdinal, detectComparisonTargets,
} = require('../pipeline/session_manager');

const { loadContext }         = require('../pipeline/context_loader');
const { streamChatResponse }  = require('../pipeline/chat_engine');
const { parseIntent }         = require('../pipeline/intent_parser');
const { buildQuery }          = require('../pipeline/query_builder');
const { rankResults }         = require('../pipeline/ranker');

// ─── POST /ai/chat — Send a message (streaming SSE) ───────────────────────────

router.post('/', async (req, res) => {
  const {
    message,
    sessionId,
    latitude,
    longitude,
    // Context hints passed from the search screen (v1 compat)
    searchBusinessIds,
    searchQuery,
    searchIntent,
    // v2: Full ranked list with positions (NEW)
    rankedBusinessList,
  } = req.body;

  const userId = req.user?._id?.toString() || null;

  // ─── Validate ──────────────────────────────────────────────────────────────
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
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const send = (obj) => {
    try { res.write(`data: ${JSON.stringify(obj)}\n\n`); } catch {}
  };

  const location = (latitude && longitude)
    ? { latitude: parseFloat(latitude), longitude: parseFloat(longitude) }
    : null;

  try {
    // ─── Load or create session ──────────────────────────────────────────────
    let session = sessionId ? await getSession(sessionId) : null;
    const activeSessionId = sessionId || `chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    if (!session) {
      session = createSession({ userId, location });
    }

    // ─── Inject search context (happens when user opens chat after search) ───
    // Inject on the first message OR whenever the session's rankedBusinessList is
    // empty (safety net: ensures ordinal resolution works even if the greeting
    // message didn't carry the list).
    const isFirstMessage = session.messages.length === 0;
    const sessionNeedsRankedList = (session.rankedBusinessList || []).length === 0;
    if ((isFirstMessage || sessionNeedsRankedList) && (searchBusinessIds?.length > 0 || rankedBusinessList?.length > 0)) {
      // Build ranked list with positions from v2 data or fall back to v1 IDs
      const list = rankedBusinessList && rankedBusinessList.length > 0
        ? rankedBusinessList
        : (searchBusinessIds || []).map((id, idx) => ({ _id: id, position: idx + 1, name: null }));

      session = updateSearchContext(session, {
        businessIds: list.map(b => b._id?.toString() || b._id),
        rankedList:  list,
        query:       searchQuery || '',
        intent:      searchIntent || null,
      });

      if (location) session.location = location;
    }

    // ─── Cumulative Intent Merging ────────────────────────────────────────────
    // If the user's message contains refinement keywords, try to extract intent
    // and merge it with the cumulative session intent.
    const REFINEMENT_PATTERNS = /\b(only|just|show me|filter|with|halal|vegan|vegetarian|gluten|open now|under £|rating|star|parking|wifi|outdoor|delivery|takeaway)\b/i;
    if (REFINEMENT_PATTERNS.test(message) && !isFirstMessage && session.lastSearchIntent) {
      try {
        const intentResult = await parseIntent(message.trim());
        const newIntent = intentResult.intent;

        // Only merge if meaningful filters were extracted (not just ordinal or off_topic)
        const hasMeaningfulFilters = newIntent.dietary || newIntent.facility_filters ||
          newIntent.price_max || newIntent.min_rating || newIntent.is_open_now ||
          newIntent.has_coupons || newIntent.meal_time;

        if (hasMeaningfulFilters && !newIntent.is_off_topic) {
          const mergedIntent = mergeCumulativeIntent(session, newIntent);

          // If there are significant filter changes, trigger a refined search
          if (newIntent.dietary || newIntent.facility_filters || newIntent.price_max !== null) {
            try {
              const { executeQuery } = require('../pipeline/retriever');
              const pipeline = buildQuery(mergedIntent, location || session.location, {
                limit: 8,
                page:  1,
              });
              const { businesses, totalCount } = await executeQuery(pipeline);
              const ranked = rankResults(businesses, mergedIntent, location || session.location);

              const newRankedList = ranked.map((b, idx) => ({
                position:          idx + 1,
                _id:               b._id,
                name:              b.name,
                category:          b.category,
                rating:            b.rating,
                distanceKm:        b._distance ? Math.round(b._distance / 100) / 10 : null,
                matchingMenuItems: (b._menuItems || []).slice(0, 3).map(i => ({
                  name: i.name, price: i.price, currency: i.currency || 'GBP',
                })),
                reasons:           b._reasons || [],
              }));

              session = updateSearchContext(session, {
                businessIds: newRankedList.map(b => b._id?.toString()),
                rankedList:  newRankedList,
                query:       session.lastSearchQuery,
                intent:      mergedIntent,
              });

              // Send updated results to client
              const cleanedForChat = newRankedList.slice(0, 6).map(cleanBusinessForChat);
              send({
                type:        'businesses',
                businesses:  cleanedForChat,
                totalCount,
                query:       session.lastSearchQuery,
                isRefinement: true,
              });
            } catch (searchErr) {
              console.warn('[Chat Route] Refinement search failed:', searchErr.message);
            }
          }
        }
      } catch (intentErr) {
        // Non-fatal — continue with existing context
        console.warn('[Chat Route] Intent extraction for refinement failed:', intentErr.message);
      }
    }

    // ─── Load RAG context ──────────────────────────────────────────────────
    const { contextText, contextType, needsNewSearch, updatedSession } =
      await loadContext(message.trim(), session, location);

    session = updatedSession;

    // ─── Handle new search triggered by context_loader ───────────────────
    if (needsNewSearch) {
      try {
        send({ type: 'searching', query: message.trim() });

        const intentResult = await parseIntent(message.trim());
        const intent       = intentResult.intent;
        const pipeline     = buildQuery(intent, location || session.location, { limit: 6, page: 1 });
        const { executeQuery } = require('../pipeline/retriever');
        const { businesses, totalCount } = await executeQuery(pipeline);
        const ranked = rankResults(businesses, intent, location || session.location);

        const newRankedList = ranked.map((b, idx) => ({
          position:          idx + 1,
          _id:               b._id,
          name:              b.name,
          category:          b.category,
          rating:            b.rating,
          distanceKm:        b._distance ? Math.round(b._distance / 100) / 10 : null,
          matchingMenuItems: (b._menuItems || []).slice(0, 3).map(i => ({
            name: i.name, price: i.price, currency: i.currency || 'GBP',
          })),
          reasons:           b._reasons || [],
        }));

        session = updateSearchContext(session, {
          businessIds: newRankedList.map(b => b._id?.toString()),
          rankedList:  newRankedList,
          query:       message.trim(),
          intent,
        });

        const cleanedForChat = newRankedList.slice(0, 6).map(cleanBusinessForChat);
        send({ type: 'businesses', businesses: cleanedForChat, totalCount, query: message.trim() });
      } catch (searchErr) {
        console.warn('[Chat Route] New search failed:', searchErr.message);
      }
    }

    // ─── Append user message ──────────────────────────────────────────────
    session = appendMessage(session, 'user', message.trim());

    // ─── Get history for LangChain (excluding current message) ───────────
    const history = getRecentHistory(session, 10).slice(0, -1);

    // ─── Stream AI response ────────────────────────────────────────────────
    await streamChatResponse({
      userMessage:  message.trim(),
      history,
      contextText,
      contextType,
      session,
      location,
      onToken: (token) => {
        send({ type: 'token', token });
      },
      onDone: async ({ fullText, suggestedFollowUps }) => {
        // Save assistant message
        session = appendMessage(session, 'assistant', fullText, {
          suggestedFollowUps,
          contextType,
        });

        await saveSession(activeSessionId, session);

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
    rankedBusinessList:  session.rankedBusinessList || [],
  });
});

// ─── DELETE /ai/chat/:sessionId — Clear session ────────────────────────────────

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
    address:    null, // Don't expose full address in chat cards
    distanceKm: biz.distanceKm,
    position:   biz.position,
    reasons:    biz.reasons || [],
    hasActiveDeals: false,
    matchingMenuItems: (biz.matchingMenuItems || []).slice(0, 2),
  };
}

module.exports = router;
