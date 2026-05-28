/**
 * Mock AI Provider Adapter
 *
 * Returns deterministic, rule-based responses without calling any external AI.
 * Uses regex patterns to handle 70% of real-world query types.
 *
 * Use cases:
 *  1. Local development without any AI provider configured
 *  2. Fallback of last resort when ALL real providers are down
 *  3. Unit testing the pipeline without mocking HTTP calls
 *
 * This adapter is always available (zero dependencies, zero latency, zero cost).
 */

const AIProviderInterface = require('./interface');
const { INTENT_EXTRACTION_VERSION } = require('../prompts/intent_extraction_v1');

// ─── Regex Rule Patterns ──────────────────────────────────────────────────────

const CATEGORY_PATTERNS = [
  { pattern: /\b(restaurant|restaurants|diner|eatery|takeaway|takeout|food)\b/i, value: 'restaurant' },
  { pattern: /\b(cafe|cafes|coffee|coffee shop|coffeehouse)\b/i,                value: 'cafe' },
  { pattern: /\b(hotel|hotels|accommodation|b&b|bed and breakfast|motel)\b/i,   value: 'hotel' },
  { pattern: /\b(salon|salons|hairdresser|barber|hair|beauty)\b/i,              value: 'salon' },
  { pattern: /\b(gym|gyms|fitness|workout|sport|sports centre)\b/i,             value: 'gym' },
  { pattern: /\b(spa|spas|massage|wellness|relaxation)\b/i,                     value: 'spa' },
  { pattern: /\b(bar|bars|pub|pubs|club|nightclub|cocktail)\b/i,                value: 'bar' },
  { pattern: /\b(pharmacy|pharmacies|chemist|chemists|drugstore)\b/i,           value: 'pharmacy' },
  { pattern: /\b(supermarket|supermarkets|grocery|groceries|market)\b/i,        value: 'supermarket' },
  { pattern: /\b(clinic|clinics|doctor|dentist|medical|hospital)\b/i,           value: 'clinic' },
];

const DIETARY_PATTERNS = [
  { pattern: /\bhalal\b/i,                     value: 'halal' },
  { pattern: /\bvegan\b/i,                     value: 'vegan' },
  { pattern: /\bvegetarian\b/i,                value: 'vegetarian' },
  { pattern: /\bgluten[- ]free\b/i,            value: 'gluten-free' },
  { pattern: /\bkosher\b/i,                    value: 'kosher' },
  { pattern: /\bdairy[- ]free\b/i,             value: 'dairy-free' },
];

const OFF_TOPIC_PATTERNS = [
  /\b(weather|temperature|forecast|rain|sunny)\b/i,
  /\b(code|programming|python|javascript|software)\b/i,
  /\b(politics|government|election|vote)\b/i,
  /\b(sports score|football result|cricket)\b/i,
  /\b(news|headline|breaking)\b/i,
];

// ─── Adapter ──────────────────────────────────────────────────────────────────

class MockAdapter extends AIProviderInterface {
  constructor(config = {}) {
    super(config);
    this.providerName = 'mock';
    this.modelName = 'regex-fallback-v1';
  }

  /**
   * Rule-based intent extraction using regex patterns.
   * No AI model called — pure deterministic logic.
   */
  async extractIntent(query, options = {}) {
    const q = query || '';

    // Check for off-topic queries
    const isOffTopic = OFF_TOPIC_PATTERNS.some(p => p.test(q));
    if (isOffTopic) {
      return this._buildIntent({ is_off_topic: true });
    }

    const intent = {
      category: null,
      menu_keyword: null,
      price_max: null,
      price_min: null,
      near_me: true,  // Default: local discovery
      city: null,
      area: null,
      min_rating: null,
      sort_by: 'distance',
      has_coupons: false,
      is_open_now: false,
      dietary: null,
      is_off_topic: false,
    };

    // Category detection
    for (const { pattern, value } of CATEGORY_PATTERNS) {
      if (pattern.test(q)) {
        intent.category = value;
        break;
      }
    }

    // Price: "under £15", "less than 20", "below £10"
    const priceMatch = q.match(/(?:under|less than|below|cheaper than|max)\s*£?\s*(\d+(?:\.\d{1,2})?)/i);
    if (priceMatch) intent.price_max = parseFloat(priceMatch[1]);

    // Price ascending: cheap, budget, affordable
    if (/\b(cheap|budget|affordable|inexpensive)\b/i.test(q)) intent.sort_by = 'price_asc';

    // Rating: best, top, excellent
    if (/\b(best|top rated|highest rated|top)\b/i.test(q)) {
      intent.min_rating = 4;
      intent.sort_by = 'rating';
    }
    if (/\b(excellent|amazing|outstanding)\b/i.test(q)) {
      intent.min_rating = 4.5;
      intent.sort_by = 'rating';
    }

    // Location: near me
    if (/\b(near me|nearby|close to me|around me|around here)\b/i.test(q)) {
      intent.near_me = true;
      intent.sort_by = intent.sort_by === 'distance' ? 'distance' : intent.sort_by;
    }

    // City extraction: "in Manchester", "in London"
    const cityMatch = q.match(/\bin\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/);
    if (cityMatch) {
      intent.city = cityMatch[1];
      intent.near_me = false;
    }

    // Coupons/deals
    if (/\b(deal|deals|offer|offers|coupon|coupons|discount|discounts)\b/i.test(q)) {
      intent.has_coupons = true;
    }

    // Open now
    if (/\b(open now|open tonight|open today|currently open)\b/i.test(q)) {
      intent.is_open_now = true;
    }

    // Dietary
    const dietary = [];
    for (const { pattern, value } of DIETARY_PATTERNS) {
      if (pattern.test(q)) dietary.push(value);
    }
    if (dietary.length > 0) intent.dietary = dietary;

    // Menu keyword: extract nouns that look like food/service items
    // If we found a category keyword, try to extract what the user actually wants
    const menuKeywordMatch = q.match(
      /\b(pizza|chicken|burger|curry|sushi|steak|pasta|fish|chips|kebab|naan|biryani|massage|facial|manicure|pedicure|waxing|haircut|colour|color|highlights|blow dry|shave|trim)\b/i
    );
    if (menuKeywordMatch) intent.menu_keyword = menuKeywordMatch[1].toLowerCase();

    return intent;
  }

  /**
   * Compose a template-based response message (no AI needed).
   */
  async generateResponse(context) {
    const { query, intent, businesses, resultCount } = context;
    const count = resultCount || (businesses || []).length;

    if (count === 0) {
      return `No businesses found matching "${query}". Try broadening your search or a different location.`;
    }

    const parts = [];

    if (count === 1) {
      parts.push(`Found 1 business`);
    } else {
      parts.push(`Found ${count} businesses`);
    }

    if (intent?.category) {
      const cat = intent.category.charAt(0).toUpperCase() + intent.category.slice(1);
      parts.push(` (${cat})`);
    }

    if (intent?.menu_keyword) {
      parts.push(` with ${intent.menu_keyword}`);
    }

    if (intent?.price_max) {
      parts.push(` under £${intent.price_max}`);
    }

    if (intent?.city) {
      parts.push(` in ${intent.city}`);
    } else if (intent?.near_me) {
      parts.push(` near you`);
    }

    if (intent?.has_coupons) {
      parts.push(` with active deals`);
    }

    parts.push(`. Sorted by ${intent?.sort_by === 'rating' ? 'rating' : 'distance'}.`);

    return parts.join('');
  }

  /**
   * Mock health check always returns healthy.
   */
  async healthCheck() {
    return {
      healthy: true,
      latencyMs: 0,
      provider: this.providerName,
      model: this.modelName,
      message: 'Mock adapter — always healthy, no external dependencies',
    };
  }

  /**
   * Mock menu extraction — returns a small sample set without calling any AI.
   * Used in dev when AI_PRIMARY_PROVIDER=mock.
   */
  async extractMenuFromImage(imageBase64, options = {}) {
    const currency = options.currency || 'GBP';
    return [
      {
        name: 'Sample Starter',
        menuCategory: 'Starters',
        price: 5.99,
        currency,
        description: 'A delicious starter dish generated by the mock adapter.',
        type: 'food',
        dietary: ['vegetarian'],
        tags: ['starter', 'vegetarian'],
        isPopular: false,
        isAvailable: true,
      },
      {
        name: 'Sample Main Course',
        menuCategory: 'Mains',
        price: 12.99,
        currency,
        description: 'A hearty main course — mock data only.',
        type: 'food',
        dietary: [],
        tags: ['main', 'grilled'],
        isPopular: true,
        isAvailable: true,
      },
      {
        name: 'Sample Dessert',
        menuCategory: 'Desserts',
        price: 4.50,
        currency,
        description: 'Sweet ending to your meal.',
        type: 'food',
        dietary: ['vegetarian'],
        tags: ['dessert', 'sweet'],
        isPopular: false,
        isAvailable: true,
      },
      {
        name: 'Sample Soft Drink',
        menuCategory: 'Drinks',
        price: 2.50,
        currency,
        description: 'Refreshing beverage.',
        type: 'drink',
        dietary: ['vegan', 'gluten-free'],
        tags: ['drink', 'cold'],
        isPopular: false,
        isAvailable: true,
      },
    ];
  }

  _buildIntent(overrides = {}) {
    return {
      category: null,
      menu_keyword: null,
      price_max: null,
      price_min: null,
      near_me: true,
      city: null,
      area: null,
      min_rating: null,
      sort_by: 'distance',
      has_coupons: false,
      is_open_now: false,
      dietary: null,
      is_off_topic: false,
      ...overrides,
    };
  }
}

module.exports = MockAdapter;
