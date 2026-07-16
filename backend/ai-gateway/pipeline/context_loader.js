/**
 * AI Chat Context Loader — RAG (Retrieval-Augmented Generation)
 *
 * Detects what the user is asking about and fetches ONLY relevant data
 * from MongoDB to inject into the AI prompt. Grounds the AI's answers
 * in HashView's actual data so it cannot hallucinate.
 *
 * Improvements in this version:
 *  - Ordinal resolution: "the second one" → resolves to rankedBusinessList[1]
 *  - Comparison context: loads FULL data for BOTH compared businesses
 *  - Position labels: context includes "Position 1:", "Position 2:" etc.
 *  - Dish-specific reviews: searches reviews mentioning the searched dish
 *  - Full opening hours: all days shown when hours/timing asked
 *  - 12 reviews (up from 6) for better sentiment analysis
 *  - Budget context: per-item totals from menu when budget question
 *  - Strict data labelling: all facts prefixed with the business name
 */

const mongoose = require('mongoose');
const {
  resolveOrdinal,
  resolveComparison,
  detectOrdinal,
  detectComparisonTargets,
  focusBusiness,
} = require('./session_manager');
const { findAffordableCombos, buildBudgetContext } = require('./budget_calculator');

// ─── Intent Detection Patterns ────────────────────────────────────────────────

const PATTERNS = {
  menuQuestion:     /\b(menu|dish|dishes|food|meal|drink|price|cost|how much|serve|offer|available|ingredients?|contain|made of|what.?s in|what is in|what does it have|allergen)\b/i,
  reviewQuestion:   /\b(review|rating|star|rated|people say|feedback|experience|recommend|opinion|quality|service|clean|staff|atmos)\b/i,
  locationQuestion: /\b(far|distance|km|mile|walk|drive|direction|address|where|how to get|near|close)\b/i,
  hoursQuestion:    /\b(open|closed|hours|time|tonight|today|now|when|close at|until|from when)\b/i,
  dietaryQuestion:  /\b(halal|vegan|vegetarian|gluten.?free|dairy.?free|nut.?free|allergen|intolerant|kosher|organic)\b/i,
  comparisonQuestion: /\b(compare|vs|versus|better|best|difference|which one|which is|cheaper|more expensive|higher rated|more reviews|recommend)\b/i,
  budgetQuestion:   /\b(budget|total|afford|how much|cost for|spending|under|within budget|for \d+|for two|for \d+ people)\b/i,
  explicitSearch:   /\b(find|search|look for|show me|where can i get|any place|any restaurant|any cafe|locate|suggest|recommend|identify|which restaurant|which place|which cafe|is there any|tell me a restaurant|tell me a place)\b/i,
  softSearch:       /\b(another|other|different|more|instead|elsewhere|nearby|alternative)\b/i,
};

/**
 * Extract keywords from a message that are likely menu item or food names.
 */
function extractFoodKeyword(message) {
  const STOP_WORDS = /\b(what|how|is|are|the|a|an|of|does|do|contain|have|ingredients|allergens|in|for|about|this|that|these|those|can|you|tell|me|any|some|more|from|please|which|where|when|who|why|i|we|they|it|be|to|and|or|but|so|get|make|do|did|was|will|would|could|should|might|may|shall|has|had|its|their|our|your)\b/gi;
  const cleaned = message
    .replace(STOP_WORDS, ' ')
    .replace(/[?!.,;:'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 60);
}

/**
 * Detect which type of context is needed for this message.
 * Extended to handle comparison and ordinal intents.
 */
function detectContextNeeds(message, session) {
  const needs = {
    businessDetail:   false,
    menuItems:        false,
    reviews:          false,
    location:         false,
    hours:            false,
    newSearch:        false,
    comparison:       false,
    budgetCalc:       false,
  };

  // Always load if we have a focused business or search results
  if (session.focusedBusinessId) needs.businessDetail = true;
  if (session.lastSearchBusinessIds?.length > 0 && !session.focusedBusinessId) needs.businessDetail = true;

  if (PATTERNS.menuQuestion.test(message)   || PATTERNS.dietaryQuestion.test(message)) needs.menuItems = true;
  if (PATTERNS.reviewQuestion.test(message))   needs.reviews = true;
  if (PATTERNS.locationQuestion.test(message)) needs.location = true;
  if (PATTERNS.hoursQuestion.test(message))    needs.hours = true;
  if (PATTERNS.comparisonQuestion.test(message)) needs.comparison = true;
  if (PATTERNS.budgetQuestion.test(message)) {
    needs.budgetCalc = true;
    needs.menuItems = true;
  }

  // Explicit search
  if (PATTERNS.explicitSearch.test(message)) {
    needs.newSearch = true;
  } else if (PATTERNS.softSearch.test(message) &&
             !PATTERNS.menuQuestion.test(message) &&
             !PATTERNS.reviewQuestion.test(message)) {
    needs.newSearch = true;
  }

  return needs;
}

/**
 * Try to detect a business name mention in the message.
 */
async function detectBusinessMention(message, session) {
  if (session.focusedBusinessName) {
    if (new RegExp(escapeRegex(session.focusedBusinessName), 'i').test(message)) {
      return session.focusedBusinessId;
    }
  }

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
    } catch { /* non-fatal */ }
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
 * @returns {Promise<{ contextText, contextType, needsNewSearch, updatedSession }>}
 */
async function loadContext(message, session, location = null) {
  const needs = detectContextNeeds(message, session);
  const contextParts = [];
  let contextType = 'conversation';
  const updatedSession = { ...session };

  // ─── Step 1: Ordinal Resolution ─────────────────────────────────────────────
  // Detect "the second one", "third restaurant" etc. → resolve to actual business
  const ordinalWord = detectOrdinal(message);
  if (ordinalWord && !needs.newSearch) {
    const resolvedBiz = resolveOrdinal(session, ordinalWord);
    if (resolvedBiz) {
      // Auto-focus to the resolved business
      updatedSession.focusedBusinessId   = resolvedBiz._id?.toString() || resolvedBiz._id;
      updatedSession.focusedBusinessName = resolvedBiz.name;
      needs.businessDetail = true;
      needs.menuItems      = true;
      contextParts.push(`[Resolved: "${ordinalWord}" → ${resolvedBiz.name} (Position ${resolvedBiz.position})]`);
    }
  }

  // ─── Step 2: Comparison Target Resolution ───────────────────────────────────
  // Detect "compare first and third" → resolve both businesses
  const comparisonTargets = detectComparisonTargets(message);
  const isComparison = comparisonTargets && comparisonTargets.length >= 2;

  if (isComparison) {
    const resolvedBizList = resolveComparison(session, comparisonTargets);
    if (resolvedBizList.length >= 2) {
      updatedSession.comparisonTargets  = comparisonTargets;
      updatedSession.isInComparisonMode = true;
      contextType = 'comparison';

      // Load full context for EACH compared business
      for (const resolvedBiz of resolvedBizList) {
        const bizId = resolvedBiz._id?.toString() || resolvedBiz._id;
        const bizContext = await loadSingleBusinessContext(bizId, resolvedBiz, {
          includeMenu: true,
          includeReviews: true,
          includeHours: true,
          dishKeyword: session.lastSearchIntent?.menu_keyword || null,
          position: resolvedBiz.position,
        });
        contextParts.push(bizContext);
      }

      return {
        contextText:    contextParts.join('\n\n---\n\n'),
        contextType:    'comparison',
        needsNewSearch: false,
        updatedSession,
      };
    }
  }

  // ─── Step 3: Business Name Mention Detection ─────────────────────────────────
  if (!updatedSession.focusedBusinessId) {
    const mentionedBusinessId = await detectBusinessMention(message, session);
    if (mentionedBusinessId && mentionedBusinessId !== session.focusedBusinessId) {
      updatedSession.focusedBusinessId = mentionedBusinessId;
      needs.businessDetail = true;
      needs.menuItems      = true;
    }
  }

  const targetBusinessId = updatedSession.focusedBusinessId;

  // ─── Step 4: Focused Business Context ──────────────────────────────────────
  if (needs.businessDetail && targetBusinessId) {
    const focusedBiz = session.rankedBusinessList?.find(
      b => (b._id?.toString() || b._id) === targetBusinessId
    );
    const bizContext = await loadSingleBusinessContext(targetBusinessId, focusedBiz, {
      includeMenu:    needs.menuItems || needs.businessDetail,
      includeReviews: needs.reviews,
      includeHours:   needs.hours,
      dishKeyword:    session.lastSearchIntent?.menu_keyword || null,
      position:       focusedBiz?.position || null,
    });
    contextParts.push(bizContext);
    contextType = 'business';
  }

  // ─── Step 5: Cross-Business Menu Search ────────────────────────────────────
  // When user asks about a dish but isn't focused on a specific business
  if (needs.menuItems && !targetBusinessId && session.lastSearchBusinessIds?.length > 0) {
    try {
      const MenuItem = mongoose.model('MenuItem');
      const foodKeyword = extractFoodKeyword(message) || session.lastSearchIntent?.menu_keyword;

      if (foodKeyword && foodKeyword.length >= 2) {
        const words = foodKeyword.split(/\s+/).filter(w => w.length > 2);
        const keywordRegex = new RegExp(words.join('|'), 'i');

        const items = await MenuItem.find({
          business: { $in: session.lastSearchBusinessIds },
          status:   'active',
          $or: [
            { name:        { $regex: keywordRegex } },
            { description: { $regex: keywordRegex } },
            { tags:        { $elemMatch: { $regex: keywordRegex } } },
          ],
        })
          .limit(16)
          .lean();

        if (items.length > 0) {
          const Business = mongoose.model('Business');
          const bizIds  = [...new Set(items.map(i => i.business.toString()))];
          const bizList = await Business.find({ _id: { $in: bizIds } }, { name: 1, category: 1 }).lean();
          const bizMap  = {};
          for (const b of bizList) bizMap[b._id.toString()] = `${b.name} (${b.category})`;

          const itemLines = items.map(item => {
            const price   = item.price > 0 ? `£${item.price.toFixed(2)}` : 'Price not listed';
            const dietary = item.dietary?.length > 0 ? ` [${item.dietary.join(', ')}]` : '';
            const biz     = bizMap[item.business.toString()] || 'Unknown';
            const desc    = item.description ? `\n    Details: ${item.description.slice(0, 300)}` : '';
            return `  • ${item.name}${dietary} — ${price} @ ${biz}${desc}`;
          }).join('\n');

          contextParts.push(`MENU ITEMS MATCHING "${foodKeyword}" (across search results):\n${itemLines}`);
          contextType = 'menu_search';
        }
      }
    } catch (err) {
      console.warn('[Context Loader] Cross-business menu search failed:', err.message);
    }
  }

  // ─── Step 6: Search Results Summary (no focused business) ─────────────────
  if (!targetBusinessId && session.rankedBusinessList?.length > 0) {
    const rankedList = session.rankedBusinessList.slice(0, 8);

    // Use pre-stored ranked list (has positions and reasons already)
    const summaryLines = rankedList.map(biz => {
      const pos     = biz.position || '?';
      const dist    = biz.distanceKm != null
        ? (biz.distanceKm < 1 ? `${Math.round(biz.distanceKm * 1000)}m` : `${biz.distanceKm}km`)
        : '';
      const rating  = biz.rating?.average?.toFixed(1) || '?';
      const reviewCount = biz.rating?.count || 0;
      const reasons = biz.reasons && biz.reasons.length > 0
        ? `\n     Reasons: ${biz.reasons.slice(0, 3).join(' | ')}`
        : '';
      const topItem = biz.matchingMenuItems?.[0];
      const topItemText = topItem
        ? `\n     Top match: ${topItem.name}${topItem.price > 0 ? ` — £${topItem.price.toFixed(2)}` : ''}`
        : '';
      return `  Position ${pos}. ${biz.name} (${biz.category})\n     Rating: ${rating}★ (${reviewCount} reviews)${dist ? ' · ' + dist : ''}${topItemText}${reasons}`;
    }).join('\n');

    contextParts.push(`SEARCH RESULTS for "${session.lastSearchQuery || 'previous search'}":\n${summaryLines}`);
    if (contextType === 'conversation') contextType = 'search_results';
  } else if (!targetBusinessId && session.lastSearchBusinessIds?.length > 0) {
    // Fallback: load from DB if rankedBusinessList wasn't stored
    try {
      const Business = mongoose.model('Business');
      const businesses = await Business.find(
        { _id: { $in: session.lastSearchBusinessIds.slice(0, 8) } },
        { name: 1, category: 1, rating: 1, address: 1 }
      ).lean();

      if (businesses.length > 0) {
        const lines = businesses.map((biz, i) =>
          `  Position ${i + 1}. ${biz.name} (${biz.category}) — ${biz.rating?.average?.toFixed(1) || '?'}★`
        ).join('\n');
        contextParts.push(`SEARCH RESULTS for "${session.lastSearchQuery || 'previous search'}":\n${lines}`);
        if (contextType === 'conversation') contextType = 'search_results';
      }
    } catch { /* non-fatal */ }
  }

  return {
    contextText:    contextParts.join('\n\n'),
    contextType,
    needsNewSearch: needs.newSearch,
    updatedSession,
  };
}

// ─── Single Business Context Loader ──────────────────────────────────────────

/**
 * Load full context for a single business: details, menu, reviews, hours.
 * Used both for focused-business context and for comparison loading.
 *
 * @param {string} businessId
 * @param {Object} [cachedData] - Pre-stored data from session (avoids extra DB query)
 * @param {Object} options
 * @returns {Promise<string>} - Formatted context text
 */
async function loadSingleBusinessContext(businessId, cachedData = null, options = {}) {
  const {
    includeMenu    = true,
    includeReviews = false,
    includeHours   = false,
    dishKeyword    = null,
    position       = null,
  } = options;

  const parts = [];

  // ─── Business Details ───────────────────────────────────────────────────────
  try {
    const Business = mongoose.model('Business');
    const biz = await Business.findById(businessId).lean();

    if (biz) {
      const posLabel = position ? `Position ${position}: ` : '';
      const rating   = biz.rating?.average?.toFixed(1) || 'No rating';
      const reviews  = biz.rating?.count || 0;
      const address  = biz.address?.fullAddress ||
        [biz.address?.buildingNumber, biz.address?.street, biz.address?.city].filter(Boolean).join(', ') ||
        'Address not specified';

      let bizHeader = `${posLabel}BUSINESS: ${biz.name}
Category: ${biz.category}
Rating: ${rating}/5 (${reviews} reviews)
Address: ${address}`;

      if (cachedData?.distanceKm != null) {
        const dist = cachedData.distanceKm < 1
          ? `${Math.round(cachedData.distanceKm * 1000)}m`
          : `${cachedData.distanceKm}km`;
        bizHeader += `\nDistance: ${dist} away`;
      }

      if (biz.description) bizHeader += `\nDescription: ${biz.description}`;
      if (biz.phone)       bizHeader += `\nPhone: ${biz.phone}`;

      // Opening hours — full week or today only
      if (biz.openingHours) {
        const hoursText = includeHours
          ? formatFullOpeningHours(biz.openingHours)
          : formatTodayHours(biz.openingHours);
        bizHeader += `\nOpening Hours: ${hoursText}`;
      }

      // Reasons from ranker (if available from cached session data)
      if (cachedData?.reasons && cachedData.reasons.length > 0) {
        bizHeader += `\nWhy recommended: ${cachedData.reasons.join(' | ')}`;
      }

      parts.push(bizHeader);
    }
  } catch (err) {
    console.warn(`[Context Loader] Business fetch failed for ${businessId}:`, err.message);
  }

  // ─── Menu Items ─────────────────────────────────────────────────────────────
  if (includeMenu) {
    try {
      const MenuItem = mongoose.model('MenuItem');

      // If a dish keyword is provided, load matching items first for dish-specific review context
      let items;
      if (dishKeyword) {
        const dishRegex = new RegExp(escapeRegex(dishKeyword), 'i');
        const matchingItems = await MenuItem.find({
          business: businessId,
          status: 'active',
          $or: [
            { name:        { $regex: dishRegex } },
            { tags:        { $elemMatch: { $regex: dishRegex } } },
            { description: { $regex: dishRegex } },
          ],
        })
          .limit(12)
          .lean();

        const remainingItems = await MenuItem.find({
          business: businessId,
          status: 'active',
          _id: { $nin: matchingItems.map(i => i._id) },
        })
          .sort({ menuCategory: 1, sortOrder: 1, isFeatured: -1 })
          .limit(20)
          .lean();

        items = [...matchingItems, ...remainingItems];
      } else {
        items = await MenuItem.find({ business: businessId, status: 'active' })
          .sort({ menuCategory: 1, sortOrder: 1, isFeatured: -1 })
          .limit(40)
          .lean();
      }

      if (items.length > 0) {
        const byCategory = {};
        for (const item of items) {
          const cat = item.menuCategory || 'General';
          if (!byCategory[cat]) byCategory[cat] = [];
          byCategory[cat].push(item);
        }

        const menuText = Object.entries(byCategory).map(([cat, catItems]) => {
          const itemLines = catItems.map(item => {
            const price   = item.price > 0 ? `£${item.price.toFixed(2)}` : 'Price not listed';
            const dietary = item.dietary?.length > 0 ? ` [${item.dietary.join(', ')}]` : '';
            const popular = item.isPopular ? ' ⭐popular' : '';
            const desc    = item.description ? ` — ${item.description.slice(0, 200)}` : '';
            return `  - ${item.name}${dietary}${popular}: ${price}${desc}`;
          }).join('\n');
          return `${cat}:\n${itemLines}`;
        }).join('\n\n');

        const totalItems = items.length;
        parts.push(`MENU (${totalItems} items listed):\n${menuText}`);
      } else {
        parts.push('MENU: No menu information available for this business.');
      }
    } catch (err) {
      console.warn(`[Context Loader] MenuItem fetch failed for ${businessId}:`, err.message);
    }
  }

  // ─── Reviews ─────────────────────────────────────────────────────────────────
  if (includeReviews) {
    try {
      const Review = mongoose.model('Review');

      // If dish keyword, also search for dish-specific reviews
      let reviews;
      if (dishKeyword) {
        const dishRegex = new RegExp(escapeRegex(dishKeyword), 'i');
        const dishReviews = await Review.find({
          business: businessId,
          status: 'approved',
          comment: { $regex: dishRegex },
        })
          .sort({ createdAt: -1 })
          .limit(4)
          .select('rating comment categoryRatings createdAt')
          .lean();

        const generalReviews = await Review.find({
          business: businessId,
          status: 'approved',
          _id: { $nin: dishReviews.map(r => r._id) },
        })
          .sort({ createdAt: -1 })
          .limit(8)
          .select('rating comment categoryRatings createdAt')
          .lean();

        reviews = [...dishReviews, ...generalReviews];
      } else {
        reviews = await Review.find({ business: businessId, status: 'approved' })
          .sort({ createdAt: -1 })
          .limit(12) // Increased from 6
          .select('rating comment categoryRatings createdAt')
          .lean();
      }

      if (reviews.length > 0) {
        const reviewLines = reviews.map(r => {
          const catRatings = r.categoryRatings
            ? Object.entries(r.categoryRatings)
                .filter(([, v]) => v != null)
                .map(([k, v]) => `${k}:${v}/10`)
                .join(', ')
            : '';
          return `  • ${r.rating}★ — "${(r.comment || '').slice(0, 150)}"${catRatings ? ` (${catRatings})` : ''}`;
        }).join('\n');

        const label = dishKeyword ? `REVIEWS (including mentions of "${dishKeyword}")` : 'RECENT REVIEWS';
        parts.push(`${label} (${reviews.length} shown):\n${reviewLines}`);
      } else {
        parts.push('REVIEWS: No approved reviews yet.');
      }
    } catch (err) {
      console.warn(`[Context Loader] Review fetch failed for ${businessId}:`, err.message);
    }
  }

  return parts.join('\n\n');
}

// ─── Private Helpers ──────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Format today's opening hours only (brief).
 */
function formatTodayHours(hours) {
  if (!hours || typeof hours !== 'object') return 'Not specified';
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const today = days[new Date().getDay()];
  const todayHours = hours[today];
  if (!todayHours) return `Today (${today}): Not specified`;
  if (todayHours.closed) return `Today (${today}): Closed`;
  return `Today (${today}): ${todayHours.open || '?'} - ${todayHours.close || '?'}`;
}

/**
 * Format full week opening hours (for timing questions).
 */
function formatFullOpeningHours(hours) {
  if (!hours || typeof hours !== 'object') return 'Not specified';
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const today = days[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  return days.map(day => {
    const h = hours[day];
    if (!h) return `${capitalize(day)}: Not set`;
    if (h.closed) return `${capitalize(day)}: Closed`;
    const isToday = day === today ? ' ← TODAY' : '';
    return `${capitalize(day)}: ${h.open || '?'} - ${h.close || '?'}${isToday}`;
  }).join(', ');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = { loadContext, detectContextNeeds };
