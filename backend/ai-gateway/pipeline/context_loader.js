/**
 * AI Chat Context Loader — RAG (Retrieval-Augmented Generation)
 *
 * Detects what the user is asking about and fetches relevant data
 * from MongoDB to inject into the AI prompt. This is the RAG layer —
 * it grounds the AI's answers in HashView's actual data.
 *
 * Detection strategy:
 *  - Business by name mention → fetch full Business + MenuItem + Reviews
 *  - Menu / price / dietary question → ensure menu items are loaded
 *    (including cross-business item search when no business is focused)
 *  - Review / rating / sentiment question → fetch recent reviews
 *  - Location / distance question → include business location data
 *  - New search trigger → run search pipeline
 *  - Generic follow-up → use existing session context
 */

const mongoose = require('mongoose');

// ─── Intent Detection Patterns ────────────────────────────────────────────────

const PATTERNS = {
  menuQuestion:     /\b(menu|dish|dishes|food|meal|drink|price|cost|how much|serve|offer|available|ingredients?|contain|made of|what.?s in|what is in|what does it have|allergen)\b/i,
  reviewQuestion:   /\b(review|rating|star|rated|people say|feedback|experience|recommend|opinion|quality|service|clean|staff|atmos)\b/i,
  locationQuestion: /\b(far|distance|km|mile|walk|drive|direction|address|where|how to get|near|close)\b/i,
  dietaryQuestion:  /\b(halal|vegan|vegetarian|gluten.?free|dairy.?free|nut.?free|allergen|intolerant|kosher|organic)\b/i,
  openQuestion:     /\b(open|closed|hours|time|tonight|today|now)\b/i,
  comparisonQuestion: /\b(compare|vs|versus|better|best|difference|which one|recommend)\b/i,
  // Explicit search intent (find, search for, show me) — always triggers new search
  explicitSearch:   /\b(find|search|look for|show me|where can i get|any place|any restaurant|any cafe|locate|suggest|recommend|identify|which restaurant|which place|which cafe|is there any|tell me a restaurant|tell me a place)\b/i,
  // Soft new search (another, other, different) — only when no menu/review context
  softSearch:       /\b(another|other|different|more|instead|elsewhere|nearby|alternative)\b/i,
};

/**
 * Extract keywords from a message that are likely menu item or food names.
 * Strips common question words to isolate the food/item term.
 */
function extractFoodKeyword(message) {
  const STOP_WORDS = /\b(what|how|is|are|the|a|an|of|does|do|contain|have|ingredients|allergens|in|for|about|this|that|these|those|can|you|tell|me|any|some|more|from|please|which|where|when|who|why|i|we|they|it|be|to|and|or|but|so|get|make|do|did|was|will|would|could|should|might|may|shall|has|had|its|their|our|your)\b/gi;
  const cleaned = message
    .replace(STOP_WORDS, ' ')
    .replace(/[?!.,;:'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 60); // Keep reasonable length for regex
}

/**
 * Detect which type of context is needed for this message.
 */
function detectContextNeeds(message, session) {
  const needs = {
    businessDetail: false,
    menuItems:      false,
    reviews:        false,
    location:       false,
    newSearch:      false,
  };

  // Always load business details if we have a focused business
  if (session.focusedBusinessId) needs.businessDetail = true;

  // If there are search results and no focused business yet, load them
  if (session.lastSearchBusinessIds?.length > 0 && !session.focusedBusinessId) {
    needs.businessDetail = true;
  }

  if (PATTERNS.menuQuestion.test(message)   || PATTERNS.dietaryQuestion.test(message)) needs.menuItems = true;
  if (PATTERNS.reviewQuestion.test(message))   needs.reviews = true;
  if (PATTERNS.locationQuestion.test(message)) needs.location = true;

  // Explicit search intent: always trigger new search even if menu/review words also present
  if (PATTERNS.explicitSearch.test(message)) {
    needs.newSearch = true;
  }
  // Soft search: only when no menu or review context words (to avoid "another halal place" confusion)
  else if (PATTERNS.softSearch.test(message) &&
           !PATTERNS.menuQuestion.test(message) &&
           !PATTERNS.reviewQuestion.test(message)) {
    needs.newSearch = true;
  }

  return needs;
}

/**
 * Try to extract a business name from the message, matching against known businesses.
 */
async function detectBusinessMention(message, session) {
  // If user directly mentions the focused business name, keep focus
  if (session.focusedBusinessName) {
    if (new RegExp(escapeRegex(session.focusedBusinessName), 'i').test(message)) {
      return session.focusedBusinessId;
    }
  }

  // If we have search results, check if any business name is mentioned
  if (session.lastSearchBusinessIds?.length > 0) {
    try {
      const Business = mongoose.model('Business');
      const businesses = await Business.find(
        { _id: { $in: session.lastSearchBusinessIds } },
        { _id: 1, name: 1 }
      ).lean();

      for (const biz of businesses) {
        if (new RegExp(escapeRegex(biz.name), 'i').test(message)) {
          return biz._id.toString();
        }
      }
    } catch {
      // Non-fatal — continue without business focus
    }
  }

  return null;
}

// ─── Main Context Loader ──────────────────────────────────────────────────────

/**
 * Load the relevant context for this chat message.
 *
 * @param {string} message    - The user's message
 * @param {Object} session    - The current chat session
 * @param {Object} [location] - { latitude, longitude } if available
 * @returns {Promise<{ contextText: string, contextType: string, updatedSession: Object }>}
 */
async function loadContext(message, session, location = null) {
  const needs = detectContextNeeds(message, session);
  const contextParts = [];
  let contextType = 'conversation';
  const updatedSession = { ...session };

  // Detect if the user is mentioning a specific business
  const mentionedBusinessId = await detectBusinessMention(message, session);
  if (mentionedBusinessId && mentionedBusinessId !== session.focusedBusinessId) {
    updatedSession.focusedBusinessId = mentionedBusinessId;
    needs.businessDetail = true;
    needs.menuItems = true;
  }

  const targetBusinessId = updatedSession.focusedBusinessId;

  // ─── Load Business Detail ─────────────────────────────────────────────────
  if (needs.businessDetail && targetBusinessId) {
    try {
      const Business = mongoose.model('Business');
      const biz = await Business.findById(targetBusinessId).lean();
      if (biz) {
        updatedSession.focusedBusinessName = biz.name;

        const distanceText = biz._distance
          ? `${(biz._distance / 1000).toFixed(1)}km away`
          : location
            ? '(distance calculating...)'
            : '(distance unknown — user location not shared)';

        contextParts.push(`
FOCUSED BUSINESS:
Name: ${biz.name}
Category: ${biz.category}
Rating: ${biz.rating?.average?.toFixed(1) || 'N/A'}/5 (${biz.rating?.count || 0} reviews)
Address: ${biz.address?.fullAddress || [biz.address?.area, biz.address?.city].filter(Boolean).join(', ') || 'Not specified'}
Distance: ${distanceText}
Status: ${biz.status === 'active' ? 'Active / Open for business' : biz.status}
${biz.description ? `Description: ${biz.description}` : ''}
${biz.openingHours ? `Opening Hours: ${formatOpeningHours(biz.openingHours)}` : ''}
`.trim());

        contextType = 'business';
      }
    } catch (err) {
      console.warn('[Context Loader] Business fetch failed:', err.message);
    }
  }

  // ─── Load Menu Items (focused business) ───────────────────────────────────
  if ((needs.menuItems || needs.businessDetail) && targetBusinessId) {
    try {
      const MenuItem = mongoose.model('MenuItem');
      const items = await MenuItem.find({ business: targetBusinessId, status: 'active' })
        .sort({ menuCategory: 1, sortOrder: 1, name: 1 })
        .limit(50)
        .lean();

      if (items.length > 0) {
        // Group by category
        const byCategory = {};
        for (const item of items) {
          const cat = item.menuCategory || 'General';
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(item);
        }

        const menuText = Object.entries(byCategory).map(([cat, catItems]) => {
          const itemLines = catItems.map(item => {
            const price    = item.price > 0 ? `£${item.price.toFixed(2)}` : 'Price not listed';
            const dietary  = item.dietary?.length > 0 ? ` [${item.dietary.join(', ')}]` : '';
            const popular  = item.isPopular ? ' ⭐popular' : '';
            // Use up to 250 chars of description so ingredient/content info is not cut off
            const desc     = item.description ? ` — ${item.description.slice(0, 250)}` : '';
            return `  - ${item.name}${dietary}${popular}: ${price}${desc}`;
          }).join('\n');
          return `${cat}:\n${itemLines}`;
        }).join('\n\n');

        contextParts.push(`MENU / SERVICES:\n${menuText}`);
        contextType = 'business_menu';
      }
    } catch (err) {
      console.warn('[Context Loader] MenuItem fetch failed:', err.message);
    }
  }

  // ─── Cross-Business Menu Item Search (no focused business) ────────────────
  // When the user asks about a specific dish/ingredient but isn't focused on a
  // business, search for matching menu items across all businesses in last search.
  if (needs.menuItems && !targetBusinessId && session.lastSearchBusinessIds?.length > 0) {
    try {
      const MenuItem = mongoose.model('MenuItem');
      const foodKeyword = extractFoodKeyword(message);

      if (foodKeyword.length >= 2) {
        const keywordRegex = new RegExp(foodKeyword.split(/\s+/).filter(w => w.length > 2).join('|'), 'i');

        const items = await MenuItem.find({
          business: { $in: session.lastSearchBusinessIds },
          status:   'active',
          $or: [
            { name:        { $regex: keywordRegex } },
            { description: { $regex: keywordRegex } },
            { tags:        { $elemMatch: { $regex: keywordRegex } } },
          ],
        })
          .limit(12)
          .lean();

        if (items.length > 0) {
          // Get business names for context
          const Business = mongoose.model('Business');
          const bizIds   = [...new Set(items.map(i => i.business.toString()))];
          const bizList  = await Business.find({ _id: { $in: bizIds } }, { name: 1, category: 1 }).lean();
          const bizMap   = {};
          for (const b of bizList) bizMap[b._id.toString()] = `${b.name} (${b.category})`;

          const itemLines = items.map(item => {
            const price    = item.price > 0 ? `£${item.price.toFixed(2)}` : 'Price not listed';
            const dietary  = item.dietary?.length > 0 ? ` [${item.dietary.join(', ')}]` : '';
            const bizLabel = bizMap[item.business.toString()] || 'Unknown business';
            // Full description — this is the key for ingredient questions
            const desc     = item.description ? `\n    Details: ${item.description.slice(0, 300)}` : '';
            return `  • ${item.name}${dietary} — ${price} @ ${bizLabel}${desc}`;
          }).join('\n');

          contextParts.push(`MENU ITEMS MATCHING YOUR QUESTION (from search results):\n${itemLines}`);
          contextType = 'menu_search';
        }
      }
    } catch (err) {
      console.warn('[Context Loader] Cross-business menu search failed:', err.message);
    }
  }

  // ─── Load Reviews ─────────────────────────────────────────────────────────
  if (needs.reviews && targetBusinessId) {
    try {
      const Review = mongoose.model('Review');
      const reviews = await Review.find({ business: targetBusinessId, status: 'approved' })
        .sort({ createdAt: -1 })
        .limit(6)
        .select('rating comment categoryRatings createdAt')
        .lean();

      if (reviews.length > 0) {
        const reviewLines = reviews.map(r => {
          const catRatings = r.categoryRatings
            ? Object.entries(r.categoryRatings)
                .filter(([, v]) => v != null)
                .map(([k, v]) => `${k}:${v}/5`)
                .join(', ')
            : '';
          return `  • ${r.rating}★ — "${(r.comment || '').slice(0, 120)}"${catRatings ? ` (${catRatings})` : ''}`;
        }).join('\n');

        contextParts.push(`RECENT REVIEWS (${reviews.length} shown):\n${reviewLines}`);
        contextType = contextType === 'business_menu' ? 'business_menu_reviews' : 'business_reviews';
      }
    } catch (err) {
      console.warn('[Context Loader] Review fetch failed:', err.message);
    }
  }

  // ─── Load Search Results Summary (no focused business) ───────────────────
  if (!targetBusinessId && session.lastSearchBusinessIds?.length > 0) {
    try {
      const Business = mongoose.model('Business');
      const businesses = await Business.find(
        { _id: { $in: session.lastSearchBusinessIds.slice(0, 8) } },
        { name: 1, category: 1, rating: 1, address: 1, _distance: 1 }
      ).lean();

      if (businesses.length > 0) {
        const summaryLines = businesses.map((biz, i) => {
          const dist = biz._distance ? `${(biz._distance / 1000).toFixed(1)}km` : '';
          return `  ${i + 1}. ${biz.name} (${biz.category}) — ${biz.rating?.average?.toFixed(1) || '?'}★${dist ? ' — ' + dist : ''}`;
        }).join('\n');

        contextParts.push(`LAST SEARCH RESULTS for "${session.lastSearchQuery || 'previous search'}":\n${summaryLines}`);
        // Only set contextType to search_results if we haven't already set a better type
        if (contextType === 'conversation') contextType = 'search_results';
      }
    } catch (err) {
      console.warn('[Context Loader] Search results fetch failed:', err.message);
    }
  }

  return {
    contextText:    contextParts.join('\n\n'),
    contextType,
    needsNewSearch: needs.newSearch,
    updatedSession,
  };
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') return 'Not specified';
  const days = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todayHours = hours[today];
  if (todayHours?.isOpen) {
    return `Today (${today}): ${todayHours.open || '?'} - ${todayHours.close || '?'}`;
  }
  return `Today (${today}): Closed`;
}

module.exports = { loadContext, detectContextNeeds };
