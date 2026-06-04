/**
 * Pipeline Layer 3: Query Builder
 *
 * Converts structured intent filters into a MongoDB aggregation pipeline.
 * This is deterministic logic — no AI involved. Pure database query construction.
 *
 * Strategy:
 *  - If location is available → use $geoNear to sort by distance first
 *  - $match filters by category, rating, dietary, city, open-now, coupons
 *  - $lookup joins MenuItem collection for menu keyword + price filtering
 *  - Meal-time awareness: filters menu items to appropriate categories
 *  - All joins are intentional LEFT-OUTER so businesses without menu data still appear
 *
 * Fuzzy matching tiers (used by search.route.js fallback logic):
 *  - Tier 1 (exact):   full phrase match, e.g. /chicken noodles/i
 *  - Tier 2 (partial): all words match individually, e.g. /chicken/i AND /noodles/i
 *  - Tier 3 (related): any word or synonym matches, e.g. /chicken|noodles|chowmein/i
 */

const mongoose = require('mongoose');
const settings = require('../config/settings');
const { getMealTimeKeywords } = require('../utils/meal_classifier');

// ─── Meal-Time Category Config ─────────────────────────────────────────────────

/**
 * Maps meal_time values to menu category preferences.
 * preferPatterns: regex-friendly substrings to INCLUDE
 * excludePatterns: regex-friendly substrings to EXCLUDE (applied as NOT matches)
 */
const MEAL_TIME_CONFIG = {
  breakfast: {
    preferPatterns:  ['breakfast', 'brunch', 'morning', 'b&b'],
    excludePatterns: ['dinner', 'evening', 'late night', 'supper'],
  },
  lunch: {
    preferPatterns:  ['lunch', 'light bite', 'sandwich', 'wrap', 'salad', 'snack', 'main'],
    excludePatterns: ['breakfast', 'late night', 'evening'],
  },
  dinner: {
    preferPatterns:  ['dinner', 'main', 'grill', 'steak', 'evening', 'special', 'curry', 'pasta', 'kebab', 'biryani'],
    excludePatterns: ['breakfast', 'morning', 'soft drink', 'beverages', 'drinks only'],
  },
};

// ─── Food Synonym Dictionary ───────────────────────────────────────────────────

/**
 * Maps a food keyword to related/alternative terms.
 * Used for Tier 3 (related) fuzzy search fallback.
 */
const FOOD_SYNONYMS = {
  'noodles':      ['chowmein', 'chow mein', 'lo mein', 'vermicelli', 'ramen', 'udon'],
  'chowmein':     ['noodles', 'chow mein', 'lo mein', 'fried noodles'],
  'chow mein':    ['noodles', 'chowmein', 'lo mein', 'fried noodles'],
  'fried rice':   ['rice', 'egg fried rice', 'veg fried rice', 'pilau', 'special rice'],
  'rice':         ['fried rice', 'pilau', 'biryani', 'pilaf'],
  'chips':        ['fries', 'french fries', 'wedges'],
  'fries':        ['chips', 'french fries', 'wedges'],
  'burger':       ['patty', 'beef burger', 'chicken burger', 'veggie burger', 'bun'],
  'curry':        ['masala', 'tikka', 'korma', 'vindaloo', 'madras', 'balti', 'saag'],
  'biryani':      ['rice', 'pilau', 'curry', 'dum biryani'],
  'pasta':        ['spaghetti', 'penne', 'tagliatelle', 'linguine', 'fettuccine', 'rigatoni'],
  'kebab':        ['doner', 'shish', 'kofte', 'kofta', 'seekh'],
  'pizza':        ['flatbread', 'margherita', 'calzone'],
  'sandwich':     ['sub', 'wrap', 'baguette', 'panini', 'roll'],
  'wrap':         ['sandwich', 'burrito', 'tortilla'],
  'chicken':      ['poultry', 'grilled chicken', 'chicken tikka', 'fried chicken'],
  'steak':        ['beef', 'sirloin', 'ribeye', 'fillet', 'rump'],
  'fish':         ['cod', 'salmon', 'haddock', 'sea bass', 'tuna', 'tilapia'],
  'soup':         ['broth', 'bisque', 'chowder', 'laksa'],
  'salad':        ['leaves', 'coleslaw', 'caesar', 'greek salad'],
  'coffee':       ['espresso', 'latte', 'cappuccino', 'americano', 'flat white'],
  'tea':          ['chai', 'green tea', 'herbal tea', 'masala chai'],
};

/**
 * Get synonym terms for a given keyword.
 * Returns array of synonyms, or empty array if none found.
 */
function getKeywordSynonyms(keyword) {
  if (!keyword) return [];
  const lower = keyword.toLowerCase().trim();
  return FOOD_SYNONYMS[lower] || [];
}

// ─── Fuzzy Match Query Builders ────────────────────────────────────────────────

/**
 * Tier 1 — Exact phrase match.
 * Matches menu items where name, tags, or description contain the full phrase.
 */
function buildExactMenuMatch(keyword) {
  const regex = new RegExp(escapeRegex(keyword), 'i');
  return {
    $or: [
      { name:        { $regex: regex } },
      { tags:        { $elemMatch: { $regex: regex } } },
      { description: { $regex: regex } },
    ],
  };
}

/**
 * Tier 2 — All-words match (partial).
 * Each individual word must appear somewhere in name/tags/description.
 * e.g. keyword="chicken noodles" → items must have "chicken" AND "noodles" (not necessarily together).
 */
function buildWordSplitMenuMatch(keywords) {
  const wordMatches = keywords.map(word => {
    const regex = new RegExp(escapeRegex(word), 'i');
    return {
      $or: [
        { name:        { $regex: regex } },
        { tags:        { $elemMatch: { $regex: regex } } },
        { description: { $regex: regex } },
      ],
    };
  });
  return { $and: wordMatches };
}

/**
 * Tier 3 — Any-word + synonym match (related).
 * Any word OR any synonym must appear.
 * Catches "Chicken Chowmein" when searching "Chicken Noodles".
 */
function buildRelatedMenuMatch(keywords) {
  const allTerms = new Set();
  for (const kw of keywords) {
    allTerms.add(kw);
    for (const syn of getKeywordSynonyms(kw)) {
      allTerms.add(syn);
    }
  }
  const termArray = [...allTerms];
  // Build a single regex alternating all terms
  const combinedRegex = new RegExp(termArray.map(escapeRegex).join('|'), 'i');

  return {
    $or: [
      { name:        { $regex: combinedRegex } },
      { tags:        { $elemMatch: { $regex: combinedRegex } } },
      { description: { $regex: combinedRegex } },
    ],
  };
}

// ─── Main Query Builder ────────────────────────────────────────────────────────

/**
 * Layer 3: Build MongoDB aggregation pipeline from intent.
 *
 * @param {Object} intent   - Normalized intent from Layer 2
 * @param {Object} location - { latitude, longitude } or null
 * @param {Object} options  - { radius, limit, page }
 * @param {string} [matchTier] - 'exact' | 'partial' | 'related' (default: 'exact')
 * @returns {Object[]} - MongoDB aggregation pipeline stages
 */
function buildQuery(intent, location, options = {}, matchTier = 'exact') {
  const { radius = settings.search.defaultRadius, limit = 10, page = 1 } = options;
  const skip = (page - 1) * limit;
  const pipeline = [];

  // ─── Stage 1: Geospatial (if location provided and near_me requested) ─────────
  if (location && (intent.near_me || !intent.city)) {
    const isDev = process.env.NODE_ENV === 'development';
    const geoNearStage = {
      near: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      distanceField: '_distance',      // metres from user
      spherical: true,
      query: { status: 'active' },     // Pre-filter: only active businesses
    };

    // Only restrict search radius in production to allow global discovery/testing in dev
    if (!isDev) {
      geoNearStage.maxDistance = radius;
    }

    pipeline.push({ $geoNear: geoNearStage });
  } else {
    // No geospatial: filter active businesses only
    pipeline.push({ $match: { status: 'active' } });
  }

  // ─── Stage 2: Core filters ────────────────────────────────────────────────────
  const matchFilters = {};

  // Category (case-insensitive)
  if (intent.category) {
    matchFilters.category = { $regex: new RegExp(`^${escapeRegex(intent.category)}$`, 'i') };
  }

  // Minimum rating
  if (intent.min_rating) {
    matchFilters['rating.average'] = { $gte: intent.min_rating };
  }

  // City (case-insensitive)
  if (intent.city && !intent.near_me) {
    matchFilters.$or = [
      { 'address.city': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
      { 'address.area': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
      { 'address.fullAddress': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
    ];
  }

  // Open now (check against current time and day of week)
  if (intent.is_open_now) {
    const now = new Date();
    const dayIndex = now.getDay(); // 0=Sunday
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[dayIndex];
    const currentHour = now.getHours() * 100 + now.getMinutes(); // e.g. 14:30 → 1430

    matchFilters[`openingHours.${currentDay}.isOpen`] = true;
    matchFilters[`openingHours.${currentDay}.open`] = { $lte: String(currentHour).padStart(4, '0') };
    matchFilters[`openingHours.${currentDay}.close`] = { $gte: String(currentHour).padStart(4, '0') };
  }

  if (Object.keys(matchFilters).length > 0) {
    pipeline.push({ $match: matchFilters });
  }

  // ─── Stage 3: Join with MenuItem ─────────────────────────────────────────────
  const hasMenuFilter = intent.menu_keyword || intent.price_max || intent.price_min || intent.dietary || intent.meal_time;

  if (hasMenuFilter) {
    // Build the menu filter based on tier and meal_time
    const menuMatchStages = [];

    // Keyword matching — tier-dependent
    if (intent.menu_keyword) {
      const keywords = intent.menu_keywords || [intent.menu_keyword];

      let keywordMatch;
      if (matchTier === 'exact') {
        keywordMatch = buildExactMenuMatch(intent.menu_keyword);
      } else if (matchTier === 'partial' && keywords.length > 1) {
        keywordMatch = buildWordSplitMenuMatch(keywords);
      } else {
        // 'related' or single-word partial
        keywordMatch = buildRelatedMenuMatch(keywords);
      }
      menuMatchStages.push({ $match: keywordMatch });
    }

    // ─── Meal-time filtering — 3-layer approach ───────────────────────────────
    //
    // Layer 1: suggestedMealTimes field — pre-classified by the food classifier on save.
    //          "Chicken Biryani" → dinner, "Full English" → breakfast
    //
    // Layer 2: menuCategory name hints — "Breakfast Menu", "Evening Specials" etc.
    //
    // Layer 3: Semantic food name dictionary — if the above two miss something,
    //          the item name itself is matched against 150+ UK+Indian food terms.
    //          This is the key fix: "Fried Rice" is known dinner food even without a category.
    //
    // Result: items matching ANY of the three layers are included.
    // All-day items (drinks, desserts, uncategorized) are always included.

    if (intent.meal_time) {
      const mealTime = intent.meal_time;
      const config   = MEAL_TIME_CONFIG[mealTime] || { preferPatterns: [], excludePatterns: [] };

      // Layer 1: suggestedMealTimes stored field
      const layer1 = { suggestedMealTimes: mealTime };

      // Layer 2: explicit menuCategory name hints
      const categoryRegex = config.preferPatterns.length > 0
        ? new RegExp(config.preferPatterns.map(escapeRegex).join('|'), 'i')
        : null;
      const layer2 = categoryRegex ? { menuCategory: { $regex: categoryRegex } } : null;

      // Layer 3: semantic food name dictionary
      const foodKeywords = getMealTimeKeywords(mealTime);
      const foodRegex    = foodKeywords.length > 0
        ? new RegExp(foodKeywords.slice(0, 50).map(escapeRegex).join('|'), 'i')
        : null;
      const layer3 = foodRegex ? { name: { $regex: foodRegex } } : null;

      // Always include all-day items and unclassified items (conservative)
      const mealTimeLayers = [
        layer1,
        { suggestedMealTimes: 'all-day' },
        { suggestedMealTimes: { $size: 0 } }, // not yet classified
      ];
      if (layer2) mealTimeLayers.push(layer2);
      if (layer3) mealTimeLayers.push(layer3);

      menuMatchStages.push({ $match: { $or: mealTimeLayers } });
    }

    // Price filter
    if (intent.price_max) menuMatchStages.push({ $match: { price: { $lte: intent.price_max } } });
    if (intent.price_min) menuMatchStages.push({ $match: { price: { $gte: intent.price_min } } });

    // Dietary filter
    if (intent.dietary) {
      menuMatchStages.push({ $match: { dietary: { $in: intent.dietary } } });
    }

    // Join menu items for this business
    pipeline.push({
      $lookup: {
        from: 'menuitems',
        let: { bizId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$business', '$$bizId'] }, status: 'active' } },
          ...menuMatchStages,
          { $limit: 5 }, // Only need a few items per business
        ],
        as: '_menuItems',
      },
    });

    // For strict menu filtering (keyword/price): only keep businesses that have matching items
    // For meal_time only (no keyword): allow all businesses but prefer those with matching items
    if (intent.menu_keyword || intent.price_max || intent.price_min) {
      pipeline.push({ $match: { '_menuItems.0': { $exists: true } } });
    }
  }

  // ─── Stage 4: Join Coupons (if deals requested) ───────────────────────────────
  if (intent.has_coupons) {
    pipeline.push({
      $lookup: {
        from: 'coupons',
        let: { bizId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$business', '$$bizId'] },
              status: 'active',
              expiresAt: { $gt: new Date() },
            },
          },
          { $limit: 3 },
        ],
        as: '_coupons',
      },
    });

    // Only keep businesses with active coupons
    pipeline.push({ $match: { '_coupons.0': { $exists: true } } });
  }

  // ─── Stage 5: Count total results (before pagination) ────────────────────────
  // We use $facet to get both count and paginated results in one query
  pipeline.push({
    $facet: {
      total: [{ $count: 'count' }],
      results: [
        { $skip: skip },
        { $limit: limit },
        // Project only needed fields (avoid sending huge documents to the pipeline)
        {
          $project: {
            _id: 1,
            name: 1,
            category: 1,
            description: 1,
            status: 1,
            address: 1,
            location: 1,
            rating: 1,
            logo: 1,
            coverImage: 1,
            images: { $slice: ['$images', 3] },
            openingHours: 1,
            externalProfiles: 1,
            isVerified: 1,
            isActive: 1,
            visitCount: 1,
            reviewCount: 1,
            lastReviewAt: 1,
            _distance: 1,
            _menuItems: 1,
            _coupons: 1,
            createdAt: 1,
          },
        },
      ],
    },
  });

  return pipeline;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { buildQuery, getKeywordSynonyms, MEAL_TIME_CONFIG };
