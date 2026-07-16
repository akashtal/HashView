/**
 * Pipeline Layer 3: Query Builder
 *
 * Converts structured intent filters into a MongoDB aggregation pipeline.
 * This is deterministic logic — no AI involved. Pure database query construction.
 *
 * Strategy:
 *  - If location is available → use $geoNear to sort by distance first
 *  - $match filters by category, rating, dietary, city, open-now, coupons, facilities
 *  - $lookup joins MenuItem collection for menu keyword + price filtering
 *  - Meal-time awareness: filters menu items to appropriate categories
 *  - All joins are intentional LEFT-OUTER so businesses without menu data still appear
 *  - Deduplication: $group by _id prevents chains appearing multiple times
 *
 * Fuzzy matching tiers:
 *  - Tier 0 (text):    MongoDB $text index search — fastest, uses name/description/tags index
 *  - Tier 1 (exact):   full phrase regex match, e.g. /chicken fried rice/i
 *  - Tier 2 (partial): all words match individually, e.g. /chicken/i AND /rice/i
 *  - Tier 3 (related): any word or synonym matches via expanded synonym list
 */

const mongoose = require('mongoose');
const settings = require('../config/settings');
const { getMealTimeKeywords } = require('../utils/meal_classifier');
const { expandSynonyms } = require('./synonym_engine');

// ─── Menu Category Config ──────────────────────────────────────────────────────
// Maps menu_category intent values to the regex patterns we match against
// the MenuCategory field stored in the MenuItem document.

const MENU_CATEGORY_PATTERNS = {
  // Actual DB values: APPETIZERS, Starters, Grilled Starters, Vegetarian Starters,
  //   Combination Appetisers, Vegetarian Combination Appetisers, Light Bites,
  //   Let's Get Started, Nibbles, Combination Appetisers
  starters: [
    'starter', 'starters', 'appetizer', 'appetiser', 'appetisers', 'appetizers',
    'combination appetis', 'grilled starter', 'vegetarian starter', 'light bite',
    'light bites', 'nibble', 'nibbles', 'let\'s get started', 'small plate',
    'mezze', 'tapas', 'antipasti',
  ],

  // Actual DB values: Mains, Main Course, Main Courses, Vegetarian Main Courses,
  //   Fresh from the Grill, GRILL & CLASSICS, Grill Combos, PASTA & FISH
  mains: [
    'mains', 'main course', 'main courses', 'vegetarian main course',
    'entree', 'entr\u00e9e', 'fresh from the grill', 'grill & classics',
    'grill combos', 'pasta & fish', 'pasta and fish',
  ],

  // Actual DB values: DESSERT, DESSERTS, Desserts, Sweets, Cakes
  desserts: [
    'dessert', 'desserts', 'pudding', 'puddings', 'sweets', 'afters',
    'ice cream', 'cakes', 'cake',
  ],

  // Actual DB values: SIDES, Sides, SIDE DISHES, Side Orders, Side Orders / Light Bites,
  //   Chips, Garlic Bread, Steak Sauces
  sides: [
    'side', 'sides', 'side dish', 'side dishes', 'side order', 'side orders',
    'extra', 'extras', 'accompaniment', 'steak sauce',
  ],

  // Actual DB values: CHILDREN'S MENU, Children's Meals, Kids, Kid's Meals,
  //   Mad Hatters Childrens Menu
  kids: [
    'kids', 'kid\'s', 'children', 'children\'s', 'childrens', 'junior', 'little ones',
  ],

  // Actual DB values: Platters, Stuff to Share, Sizzling Steak Platters,
  //   Signature Tawa Platters, Surf & Turf Combos
  sharing: [
    'sharing', 'platter', 'platters', 'stuff to share', 'party platter',
    'combo', 'combos', 'mixed platter', 'sharing board', 'tapas',
    'surf & turf', 'surf and turf',
  ],

  // Actual DB values: Beverages, Beers, Hot Drinks, Soft Drinks, Wine, Spirits, Thai Tea
  drinks: [
    'drink', 'drinks', 'beverage', 'beverages', 'soft drink', 'soft drinks',
    'hot drink', 'hot drinks', 'juice', 'cocktail', 'beer', 'beers', 'wine',
    'spirits', 'tea', 'coffee',
  ],

  // Actual DB values: Specials, ITEMS (TODAY'S SPECIAL), Lunch Menu, Meal Deals
  specials: [
    'special', 'specials', 'today\'s special', 'chef special', 'seasonal',
    'meal deal', 'meal deals',
  ],
};

// ─── Meal-Time Category Config ─────────────────────────────────────────────────
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

// ─── Fuzzy Match Query Builders ────────────────────────────────────────────────

/**
 * Tier 0 — MongoDB native text search.
 * Uses the menuitem_text_search index (name×10, tags×7, description×3).
 * Fastest tier — uses index, no regex scan.
 */
function buildTextSearchMenuMatch(keyword) {
  // Wrap multi-word phrase in quotes for phrase search
  const searchPhrase = keyword.includes(' ') ? `"${keyword}"` : keyword;
  return { $text: { $search: searchPhrase } };
}

/**
 * Tier 1 — Exact phrase regex match.
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
 * Uses the synonym engine for full expansion (200+ terms).
 * Any word OR any synonym must appear.
 */
function buildRelatedMenuMatch(keywords) {
  // Use synonym engine for full expansion
  const allTerms = expandSynonyms(keywords);
  const termArray = [...new Set(allTerms)].slice(0, 60); // cap to prevent monster regex
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
 * @param {string} [matchTier] - 'text' | 'exact' | 'partial' | 'related' (default: 'exact')
 * @returns {Object[]} - MongoDB aggregation pipeline stages
 */
function buildQuery(intent, location, options = {}, matchTier = 'exact') {
  const { radius = settings.search.defaultRadius, limit = 10, page = 1 } = options;

  // Apply distance_max override if specified in intent
  const effectiveRadius = intent.distance_max
    ? Math.min(intent.distance_max * 1000, 50000)  // convert km to metres, cap 50km
    : radius;

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
      distanceField: '_distance',
      spherical: true,
      query: { status: 'active' },
    };

    if (!isDev) {
      geoNearStage.maxDistance = effectiveRadius;
    }

    pipeline.push({ $geoNear: geoNearStage });
  } else {
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

  // City filter — applies even alongside geo search (v4 fix: was gated on !near_me which broke it)
  if (intent.city) {
    matchFilters.$or = [
      { 'address.city':        { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
      { 'address.area':        { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
      { 'address.fullAddress': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
    ];
  }

  // Open now
  if (intent.is_open_now) {
    const now = new Date();
    const dayIndex = now.getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[dayIndex];
    const currentHour = now.getHours() * 100 + now.getMinutes();

    matchFilters[`openingHours.${currentDay}.isOpen`] = true;
    matchFilters[`openingHours.${currentDay}.open`] = { $lte: String(currentHour).padStart(4, '0') };
    matchFilters[`openingHours.${currentDay}.close`] = { $gte: String(currentHour).padStart(4, '0') };
  }

  if (Object.keys(matchFilters).length > 0) {
    pipeline.push({ $match: matchFilters });
  }

  // ─── Stage 3: Join with MenuItem ─────────────────────────────────────────────
  const hasMenuFilter = intent.menu_keyword || intent.price_max || intent.price_min
    || intent.dietary || intent.meal_time || intent.menu_items
    || intent.menu_category || intent.budget_total;

  if (hasMenuFilter) {
    const menuMatchStages = [];

    // ── 3a: menu_category filter (starters / mains / desserts / kids / sharing etc.) ──
    // IMPORTANT: We only filter on menuCategory (the section label) and tags.
    // We do NOT search item names — that causes false positives (e.g. a Sides item
    // with "Add to your main meal" in the name would match a mains search).
    if (intent.menu_category) {
      const patterns = MENU_CATEGORY_PATTERNS[intent.menu_category] || [intent.menu_category];
      const catRegex = new RegExp(patterns.map(escapeRegex).join('|'), 'i');
      menuMatchStages.push({
        $match: {
          $or: [
            { menuCategory: { $regex: catRegex } },          // section label only
            { tags: { $elemMatch: { $regex: catRegex } } },  // explicit tags
          ],
        },
      });
    }

    // Keyword matching — tier-dependent
    if (intent.menu_keyword) {
      const keywords = intent.menu_keywords || [intent.menu_keyword];

      let keywordMatch;
      if (matchTier === 'text') {
        keywordMatch = buildTextSearchMenuMatch(intent.menu_keyword);
      } else if (matchTier === 'exact') {
        keywordMatch = buildExactMenuMatch(intent.menu_keyword);
      } else if (matchTier === 'partial' && keywords.length > 1) {
        keywordMatch = buildWordSplitMenuMatch(keywords);
      } else {
        // 'related' or single-word partial — full synonym expansion
        keywordMatch = buildRelatedMenuMatch(keywords);
      }
      menuMatchStages.push({ $match: keywordMatch });
    }

    // Meal-time filtering (3-layer: suggestedMealTimes + category name + food keyword dict)
    if (intent.meal_time) {
      const mealTime = intent.meal_time;
      const config   = MEAL_TIME_CONFIG[mealTime] || { preferPatterns: [], excludePatterns: [] };

      const layer1 = { suggestedMealTimes: mealTime };

      const categoryRegex = config.preferPatterns.length > 0
        ? new RegExp(config.preferPatterns.map(escapeRegex).join('|'), 'i')
        : null;
      const layer2 = categoryRegex ? { menuCategory: { $regex: categoryRegex } } : null;

      const foodKeywords = getMealTimeKeywords(mealTime);
      const foodRegex    = foodKeywords.length > 0
        ? new RegExp(foodKeywords.slice(0, 50).map(escapeRegex).join('|'), 'i')
        : null;
      const layer3 = foodRegex ? { name: { $regex: foodRegex } } : null;

      const mealTimeLayers = [
        layer1,
        { suggestedMealTimes: 'all-day' },
        { suggestedMealTimes: { $size: 0 } },
      ];
      if (layer2) mealTimeLayers.push(layer2);
      if (layer3) mealTimeLayers.push(layer3);

      menuMatchStages.push({ $match: { $or: mealTimeLayers } });
    }

    // Price filter
    if (intent.price_max) menuMatchStages.push({ $match: { price: { $lte: intent.price_max } } });
    if (intent.price_min) menuMatchStages.push({ $match: { price: { $gte: intent.price_min } } });

    // Budget total — for "3 course under £20": show items priced <= budget/3 per course
    if (intent.budget_total && !intent.price_max) {
      const perCourseMax = Math.ceil(intent.budget_total / 3 * 1.25); // 25% headroom
      menuMatchStages.push({ $match: { price: { $lte: perCourseMax } } });
    }

    // Dietary filter — exact tag match PLUS name/description fallback for sparse-tagged menus
    if (intent.dietary) {
      const dietaryLower = intent.dietary.map(d => d.toLowerCase());

      // Build regex for name/description fallback (for items not formally tagged)
      const dietaryTermMap = {
        'vegan':        ['vegan', 'plant based', 'plant-based', '(ve)', 'v '],
        'vegetarian':   ['vegetarian', 'veggie', '(v)', 'v ', 'no meat'],
        'gluten-free':  ['gluten free', 'gluten-free', 'gf', 'coeliac', 'wheat free'],
        'dairy-free':   ['dairy free', 'dairy-free', 'lactose free', 'non-dairy'],
        'nut-free':     ['nut free', 'nut-free', 'no nuts', 'allergen free'],
        'halal':        ['halal', 'halaal', 'zabiha'],
      };

      const fallbackTerms = [];
      for (const d of dietaryLower) {
        const terms = dietaryTermMap[d] || [d];
        fallbackTerms.push(...terms);
      }
      const fallbackRegex = new RegExp(fallbackTerms.map(escapeRegex).join('|'), 'i');

      menuMatchStages.push({
        $match: {
          $or: [
            { dietary: { $in: dietaryLower } },                              // exact tag
            { name: { $regex: fallbackRegex } },                             // name fallback
            { description: { $regex: fallbackRegex } },                      // description fallback
            { tags: { $elemMatch: { $regex: fallbackRegex } } },             // tags fallback
          ],
        },
      });
    }

    // Join menu items for this business
    pipeline.push({
      $lookup: {
        from: 'menuitems',
        let: { bizId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$business', '$$bizId'] }, status: 'active' } },
          ...menuMatchStages,
          { $limit: 8 }, // Allow more items per business for better scoring
        ],
        as: '_menuItems',
      },
    });

    // For strict menu filtering: only keep businesses that have matching items
    // Exception: meal_time-only queries (no other filter) allow all businesses
    const strictFilters = intent.menu_keyword || intent.price_max || intent.price_min
      || intent.dietary || intent.menu_items || intent.menu_category || intent.budget_total;
    if (strictFilters) {
      pipeline.push({ $match: { '_menuItems.0': { $exists: true } } });
    }
  } else {
    // No menu filter — add empty array so downstream stages don't break
    pipeline.push({ $addFields: { _menuItems: [] } });
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

    pipeline.push({ $match: { '_coupons.0': { $exists: true } } });
  } else {
    pipeline.push({ $addFields: { _coupons: [] } });
  }

  // ─── Stage 5: Deduplication ───────────────────────────────────────────────────
  // Group by _id to prevent the same business appearing multiple times
  // (can happen when multiple menu items match or when chains have multiple listings)
  pipeline.push({
    $group: {
      _id: '$_id',
      // Preserve all document fields
      name:              { $first: '$name' },
      category:          { $first: '$category' },
      description:       { $first: '$description' },
      status:            { $first: '$status' },
      address:           { $first: '$address' },
      location:          { $first: '$location' },
      rating:            { $first: '$rating' },
      logo:              { $first: '$logo' },
      coverImage:        { $first: '$coverImage' },
      images:            { $first: '$images' },
      openingHours:      { $first: '$openingHours' },
      externalProfiles:  { $first: '$externalProfiles' },
      isVerified:        { $first: '$isVerified' },
      isActive:          { $first: '$isActive' },
      visitCount:        { $first: '$visitCount' },
      reviewCount:       { $first: '$reviewCount' },
      lastReviewAt:      { $first: '$lastReviewAt' },
      _distance:         { $first: '$_distance' },
      _menuItems:        { $first: '$_menuItems' },
      _coupons:          { $first: '$_coupons' },
      createdAt:         { $first: '$createdAt' },
    },
  });

  // ─── Stage 6: Add computed fields for ranking ─────────────────────────────────
  pipeline.push({
    $addFields: {
      menuItemCount: { $size: '$_menuItems' },
      hasMenu:       { $gt: [{ $size: '$_menuItems' }, 0] },
    },
  });

  // ─── Stage 7: Count + paginate with $facet ────────────────────────────────────
  pipeline.push({
    $facet: {
      total: [{ $count: 'count' }],
      results: [
        { $skip: skip },
        { $limit: limit },
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
            menuItemCount: 1,
            hasMenu: 1,
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

module.exports = { buildQuery, MEAL_TIME_CONFIG };
