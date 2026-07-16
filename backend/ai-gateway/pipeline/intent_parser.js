/**
 * Pipeline Layer 2: Intent Parser
 *
 * Converts a natural language query into structured search filters using the
 * active AI provider. If the AI fails, falls back to the mock (regex) adapter.
 *
 * Output shape (v3):
 * {
 *   intent_type: "search"|"compare"|"recommend"|"followup"|"detail"|"menu_search"|"budget_search"|"dietary_search"|"review_search"|"off_topic"
 *   category: "restaurant"|null,
 *   menu_keyword: "chicken fried rice"|null,
 *   menu_keywords: ["chicken","fried","rice"]|null,
 *   menu_items: ["chicken fried rice","beef curry","coke"]|null,  // multi-item budget
 *   meal_time: "breakfast"|"lunch"|"dinner"|null,
 *   corrected_query: "chicken noodles"|null,
 *   price_max: 15|null,
 *   price_min: null,
 *   budget_total: 20|null,        // total budget for multi-item orders
 *   near_me: true,
 *   city: null,
 *   area: null,
 *   distance_max: 3.2|null,      // km
 *   min_rating: 4|null,
 *   review_sentiment: "positive"|"negative"|null,
 *   sort_by: "distance"|"rating"|"price_asc"|"price_desc"|"newest",
 *   has_coupons: false,
 *   is_open_now: false,
 *   dietary: ["halal"]|null,
 *   facility_filters: ["parking","wifi"]|null,
 *   comparison_intent: false,
 *   comparison_targets: ["first","third"]|null,
 *   ordinal_reference: "second"|null,
 *   is_off_topic: false,
 * }
 */

const { getRouter } = require('../providers/router');
const { correctKeywords } = require('./synonym_engine');

// Valid ordinal words for reference resolution
const ORDINAL_WORDS = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'last'];

// Valid facility filter values
const VALID_FACILITIES = [
  'parking', 'wifi', 'outdoor_seating', 'family_friendly', 'alcohol',
  'pet_friendly', 'delivery', 'takeaway', 'dine_in', 'wheelchair',
  'reservation', 'private_dining', 'kids_menu',
];

// Valid dietary values (spicy is NOT a dietary requirement — it's a flavour/menu filter)
const VALID_DIETARY = [
  'halal', 'vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'nut-free',
  'kosher', 'organic', 'healthy', 'low-calorie', 'protein-rich', 'kids-friendly',
];

// Valid menu category sections
const VALID_MENU_CATEGORIES = [
  'starters', 'mains', 'desserts', 'sides', 'kids', 'sharing', 'drinks', 'specials',
];

// ─── Deterministic Query Pre-Pass ─────────────────────────────────────────────
// These rules run on the RAW query BEFORE and AFTER the LLM.
// They catch cases where the LLM misses or misclassifies intent fields.
// Deterministic = no AI, pure regex — fast and always correct.

const MENU_CATEGORY_RULES = [
  { regex: /\b(starters?|appetiz|appetis|starter\s+course|small\s+plate|mezze|antipasti)\b/i, category: 'starters' },
  { regex: /\b(mains?|main\s+course|main\s+meal|main\s+dish|entree|entr[eé]e|maindish)\b/i, category: 'mains' },
  { regex: /\b(desserts?|pudding|puddings|sweets?|afters|sweet\s+course)\b/i, category: 'desserts' },
  { regex: /\b(sides?|side\s+dish|side\s+order|extras?|accompaniment)\b/i, category: 'sides' },
  { regex: /\b(kids?(\s+menu|\s+meal|\s+food)?|childrens?(\s+menu)?|kiddie|junior\s+meal)\b/i, category: 'kids' },
  { regex: /\b(sharing\s+platters?|sharing\s+boards?|sharing|platters?|party\s+platters?|mixed\s+platters?|stuff\s+to\s+share)\b/i, category: 'sharing' },
  { regex: /\b(3[\s-]?course|three[\s-]?course|set\s+menu|tasting\s+menu|meal\s+deal)\b/i, category: 'mains' },
];

const DIETARY_RULES = [
  { regex: /\b(vegetarian|veggie(?:\s+food|\s+option|\s+meal)?(?:\s+option|\s+dish)?)\b/i, dietary: 'vegetarian' },
  { regex: /\b(vegan|plant[\s-]?based)\b/i, dietary: 'vegan' },
  { regex: /\b(gluten[\s-]?free|coeliac|wheat[\s-]?free|GF)\b/i, dietary: 'gluten-free' },
  { regex: /\b(dairy[\s-]?free|lactose[\s-]?free)\b/i, dietary: 'dairy-free' },
  { regex: /\b(nut[\s-]?free|no\s+nuts?|nut\s+allergy)\b/i, dietary: 'nut-free' },
  { regex: /\b(halal|muslim[\s-]?friendly|halaal)\b/i, dietary: 'halal' },
];

const CITY_RULES = /\bin\s+(llandudno|london|manchester|birmingham|bristol|leeds|cardiff|glasgow|edinburgh|liverpool|sheffield|newcastle|nottingham|brighton|cambridge|oxford|york|exeter|bath|chester|salford|swansea|newport|bangor|wrexham|rhyl|conwy|colwyn\s+bay|abergele|prestatyn|holyhead|caernarfon|aberystwyth)\b/i;
const NEAR_ME_RULES = /\b(near\s+me|nearby|close\s+to\s+me|around\s+here|around\s+me|near\s+by)\b/i;
const SPICY_RULES = /\b(spicy|spice[ds]?|hot\s+food|chilli\s+food|piri\s+piri)\b/i;
const PRICE_MAX_RULES = /(?:under|less\s+than|below|cheaper\s+than|no\s+more\s+than)\s+[£$]?\s*(\d+(?:\.\d{1,2})?)\s*(?:pounds?|gbp)?/i;
const BUDGET_TOTAL_RULES = /(?:\d+[\s-]?course|set\s+menu|tasting\s+menu|meal\s+deal).*?(?:under|less\s+than|below)\s+[£$]?\s*(\d+(?:\.\d{1,2})?)\s*(?:pounds?|gbp)?(?:\s+per\s+person)?/i;
const PRICE_SORT_DESC_RULES = /\b(premium|fine\s+dining|luxury|expensive|high[\s-]?end|upscale)\b/i;
const BUDGET_RULES = /\b(budget|cheap(?:est)?|affordable|low[\s-]?cost|inexpensive)\b/i;
const MEAL_TIME_RULES = {
  breakfast: /\b(breakfast|brunch|morning\s+meal|fry[\s-]?up|full\s+english)\b/i,
  lunch:     /\b(lunch|lunchtime|midday\s+meal|noon\s+meal)\b/i,
  dinner:    /\b(dinner|evening\s+meal|supper|evening\s+food)\b/i,
};

/**
 * Apply deterministic rules to the raw query and merge with LLM intent.
 * The LLM fills in fields the rules can't detect; the rules correct fields the LLM gets wrong.
 */
function applyDeterministicRules(query, llmIntent) {
  const q = query.toLowerCase();
  const intent = { ...llmIntent };

  // 1. menu_category — check rules first, LLM second
  if (!intent.menu_category) {
    for (const rule of MENU_CATEGORY_RULES) {
      if (rule.regex.test(query)) {
        intent.menu_category = rule.category;
        break;
      }
    }
  }

  // 2. dietary — merge rules with LLM output
  const detectedDietary = new Set(intent.dietary || []);
  for (const rule of DIETARY_RULES) {
    if (rule.regex.test(query)) {
      detectedDietary.add(rule.dietary);
      // Remove from menu_keyword if it was misclassified
      if (intent.menu_keyword?.toLowerCase() === rule.dietary) {
        intent.menu_keyword = null;
      }
    }
  }
  intent.dietary = detectedDietary.size > 0 ? [...detectedDietary] : null;

  // 3. spicy → menu_keyword (NOT dietary)
  if (SPICY_RULES.test(query)) {
    intent.menu_keyword = intent.menu_keyword || 'spicy';
    // Remove spicy from dietary if LLM put it there
    if (intent.dietary) {
      intent.dietary = intent.dietary.filter(d => d !== 'spicy');
      if (intent.dietary.length === 0) intent.dietary = null;
    }
  }

  // 4. near_me and city
  const cityMatch = query.match(CITY_RULES);
  if (cityMatch) {
    intent.city = cityMatch[1].toLowerCase();
    intent.near_me = false;
  }
  if (NEAR_ME_RULES.test(query)) {
    intent.near_me = true;
  }

  // 5. price_max and budget_total — deterministic extraction
  // Check for multi-course budget FIRST (3-course under £20 → budget_total, not price_max)
  const budgetTotalMatch = query.match(BUDGET_TOTAL_RULES);
  if (budgetTotalMatch) {
    intent.budget_total = parseFloat(budgetTotalMatch[1]);
    intent.price_max = null; // Clear price_max — it's a total, not per-item
  } else {
    const priceMatch = query.match(PRICE_MAX_RULES);
    if (priceMatch) {
      intent.price_max = parseFloat(priceMatch[1]);
    }
  }

  // 6. sort_by signals
  if (PRICE_SORT_DESC_RULES.test(query) && !intent.sort_by?.includes('price')) {
    intent.sort_by = 'price_desc';
    intent.min_rating = intent.min_rating || 4;
  }
  if (BUDGET_RULES.test(query) && !intent.sort_by?.includes('price')) {
    intent.sort_by = 'price_asc';
  }

  // 7. meal_time
  if (!intent.meal_time) {
    for (const [mealTime, regex] of Object.entries(MEAL_TIME_RULES)) {
      if (regex.test(query)) {
        intent.meal_time = mealTime;
        break;
      }
    }
  }

  return intent;
}

/**
 * Layer 2: Parse natural language intent.
 *
 * @param {string} query - Sanitized user query from Layer 1
 * @returns {Promise<{ intent, provider, model, fallbackUsed }>}
 */
async function parseIntent(query) {
  const router = getRouter();
  const result = await router.extractIntent(query);

  // Post-validation: ensure intent has all required fields with correct types
  const normalizedIntent = normalizeIntent(result.intent);

  // Apply deterministic overrides — catch anything the LLM missed or got wrong
  const intent = applyDeterministicRules(query, normalizedIntent);

  return {
    intent,
    provider: result.provider,
    model: result.model,
    fallbackUsed: result.fallbackUsed,
  };
}

/**
 * Normalize and validate an intent object to ensure it has all required fields
 * with correct types, regardless of what the AI returned.
 */
function normalizeIntent(raw = {}) {
  // ─── Intent Type ──────────────────────────────────────────────────────────────
  const VALID_INTENT_TYPES = ['search', 'compare', 'recommend', 'followup', 'detail', 'menu_search', 'budget_search', 'dietary_search', 'review_search', 'off_topic'];
  const intent_type = VALID_INTENT_TYPES.includes(raw.intent_type) ? raw.intent_type : 'search';

  // ─── Meal Time ────────────────────────────────────────────────────────────────
  const VALID_MEAL_TIMES = ['breakfast', 'lunch', 'dinner'];
  const rawMealTime = typeof raw.meal_time === 'string' ? raw.meal_time.toLowerCase() : null;
  const meal_time = VALID_MEAL_TIMES.includes(rawMealTime) ? rawMealTime : null;

  // ─── Menu Keyword ─────────────────────────────────────────────────────────────
  let menu_keyword = typeof raw.menu_keyword === 'string' && raw.menu_keyword.trim()
    ? raw.menu_keyword.toLowerCase().trim()
    : null;

  // ─── Menu Keywords ────────────────────────────────────────────────────────────
  let menu_keywords = null;
  if (Array.isArray(raw.menu_keywords) && raw.menu_keywords.length > 0) {
    const cleaned = raw.menu_keywords
      .filter(k => typeof k === 'string' && k.trim().length > 1)
      .map(k => k.toLowerCase().trim());
    if (cleaned.length > 1) {
      menu_keywords = [...new Set(cleaned)];
    }
  }

  // Auto-split multi-word menu_keyword if menu_keywords not provided
  if (menu_keyword && !menu_keywords) {
    const words = menu_keyword.split(/\s+/).filter(w => w.length > 1);
    if (words.length > 1) {
      menu_keywords = words;
    }
  }

  // ─── Spell Correction Pass on Keywords ───────────────────────────────────────
  if (menu_keywords) {
    const corrected = correctKeywords(menu_keywords);
    if (corrected.join(' ') !== menu_keywords.join(' ')) {
      menu_keywords = corrected;
      // Re-join to form corrected menu_keyword phrase if it changed
      if (menu_keyword) {
        menu_keyword = corrected.join(' ');
      }
    }
  }

  // ─── Multi-item menu list ─────────────────────────────────────────────────────
  let menu_items = null;
  if (Array.isArray(raw.menu_items) && raw.menu_items.length > 0) {
    const cleanedItems = raw.menu_items
      .filter(item => typeof item === 'string' && item.trim().length > 0)
      .map(item => item.toLowerCase().trim());
    if (cleanedItems.length > 0) menu_items = cleanedItems;
  }

  // ─── Corrected Query ─────────────────────────────────────────────────────────
  const corrected_query = typeof raw.corrected_query === 'string' && raw.corrected_query.trim()
    ? raw.corrected_query.toLowerCase().trim()
    : null;

  // ─── Dietary ─────────────────────────────────────────────────────────────────
  let dietary = null;
  if (Array.isArray(raw.dietary) && raw.dietary.length > 0) {
    const validDietary = raw.dietary
      .filter(d => typeof d === 'string' && VALID_DIETARY.includes(d.toLowerCase().trim()))
      .map(d => d.toLowerCase().trim());
    if (validDietary.length > 0) dietary = [...new Set(validDietary)];
  }

  // ─── Facility Filters ────────────────────────────────────────────────────────
  let facility_filters = null;
  if (Array.isArray(raw.facility_filters) && raw.facility_filters.length > 0) {
    const validFacilities = raw.facility_filters
      .filter(f => typeof f === 'string' && VALID_FACILITIES.includes(f.toLowerCase().trim()))
      .map(f => f.toLowerCase().trim());
    if (validFacilities.length > 0) facility_filters = [...new Set(validFacilities)];
  }

  // ─── Comparison ──────────────────────────────────────────────────────────────
  let comparison_targets = null;
  if (Array.isArray(raw.comparison_targets) && raw.comparison_targets.length > 0) {
    const validTargets = raw.comparison_targets
      .filter(t => typeof t === 'string' && ORDINAL_WORDS.includes(t.toLowerCase().trim()))
      .map(t => t.toLowerCase().trim());
    if (validTargets.length > 0) comparison_targets = validTargets;
  }

  // ─── Ordinal Reference ────────────────────────────────────────────────────────
  const ordinal_reference = typeof raw.ordinal_reference === 'string' && ORDINAL_WORDS.includes(raw.ordinal_reference.toLowerCase().trim())
    ? raw.ordinal_reference.toLowerCase().trim()
    : null;

  // ─── Review Sentiment ────────────────────────────────────────────────────────
  const review_sentiment = ['positive', 'negative'].includes(raw.review_sentiment)
    ? raw.review_sentiment
    : null;

  // ─── Distance ────────────────────────────────────────────────────────────────
  const distance_max = (typeof raw.distance_max === 'number' && raw.distance_max > 0 && raw.distance_max <= 50)
    ? raw.distance_max
    : null;

  // ─── Budget Total ─────────────────────────────────────────────────────────────
  const budget_total = (typeof raw.budget_total === 'number' && raw.budget_total > 0)
    ? raw.budget_total
    : null;

  // ─── Menu Category (v4: starters/mains/desserts/kids/sharing etc.) ──────────
  const menu_category = typeof raw.menu_category === 'string' &&
    VALID_MENU_CATEGORIES.includes(raw.menu_category.toLowerCase().trim())
    ? raw.menu_category.toLowerCase().trim()
    : null;

  return {
    intent_type,
    category:           typeof raw.category === 'string'     ? raw.category.toLowerCase() : null,
    menu_keyword,
    menu_keywords,
    menu_items,
    menu_category,
    meal_time,
    corrected_query,
    price_max:          (typeof raw.price_max === 'number' && raw.price_max > 0) ? raw.price_max : null,
    price_min:          (typeof raw.price_min === 'number' && raw.price_min > 0) ? raw.price_min : null,
    budget_total,
    // v4 fix: respect the LLM's near_me decision — do NOT force true
    near_me:            raw.near_me === true,
    city:               typeof raw.city === 'string'          ? raw.city : null,
    area:               typeof raw.area === 'string'          ? raw.area : null,
    distance_max,
    min_rating:         (typeof raw.min_rating === 'number' && raw.min_rating >= 1 && raw.min_rating <= 5) ? raw.min_rating : null,
    review_sentiment,
    sort_by:            ['distance', 'rating', 'price_asc', 'price_desc', 'newest'].includes(raw.sort_by) ? raw.sort_by : 'distance',
    has_coupons:        raw.has_coupons === true,
    is_open_now:        raw.is_open_now === true,
    dietary,
    facility_filters,
    comparison_intent:  raw.comparison_intent === true,
    comparison_targets,
    ordinal_reference,
    is_off_topic:       raw.is_off_topic === true,
  };
}

module.exports = { parseIntent, normalizeIntent };
