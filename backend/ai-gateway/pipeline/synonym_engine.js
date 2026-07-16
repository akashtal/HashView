/**
 * Synonym Engine
 *
 * Provides:
 *  1. Food/drink synonym expansion — maps a keyword to all related terms
 *     (bidirectional: fries→chips AND chips→fries)
 *  2. Spell correction — corrects common misspellings BEFORE query building
 *
 * Coverage: UK, South Asian, Middle Eastern, Chinese, Italian, Mexican,
 * American cuisine terms, dietary terms, and business category terms.
 *
 * Usage:
 *   const { expandSynonyms, correctSpelling } = require('./synonym_engine');
 *   expandSynonyms(['fried rice']) → ['fried rice', 'egg fried rice', 'veg fried rice', 'pilau', ...]
 *   correctSpelling('chiken') → 'chicken'
 */

// ─── Master Synonym Dictionary ─────────────────────────────────────────────────
//
// Each entry maps a canonical term to its synonyms.
// The engine also builds a REVERSE map so that looking up any synonym
// returns all related terms including the original.

const RAW_SYNONYMS = {
  // ─── Starches & Rice ─────────────────────────────────────────────────────────
  'fried rice':        ['egg fried rice', 'veg fried rice', 'vegetable fried rice', 'special fried rice', 'pilau', 'pilaf', 'rice'],
  'rice':              ['fried rice', 'pilau', 'biryani', 'pilaf', 'boiled rice', 'steamed rice', 'basmati'],
  'biryani':           ['rice', 'pilau', 'dum biryani', 'chicken biryani', 'lamb biryani', 'veg biryani', 'hyderabadi biryani'],
  'pilau':             ['pilaf', 'rice', 'fried rice', 'biryani'],
  'chips':             ['fries', 'french fries', 'wedges', 'potato wedges', 'chunky chips', 'skinny fries', 'shoestring fries'],
  'fries':             ['chips', 'french fries', 'wedges', 'potato wedges', 'chunky chips', 'skinny fries'],
  'french fries':      ['chips', 'fries', 'wedges'],

  // ─── Noodles & Pasta ─────────────────────────────────────────────────────────
  'noodles':           ['chowmein', 'chow mein', 'lo mein', 'vermicelli', 'ramen', 'udon', 'pad thai', 'hakka noodles', 'egg noodles', 'rice noodles', 'glass noodles'],
  'chowmein':          ['noodles', 'chow mein', 'lo mein', 'fried noodles', 'egg noodles', 'hakka noodles'],
  'chow mein':         ['noodles', 'chowmein', 'lo mein', 'fried noodles'],
  'pasta':             ['spaghetti', 'penne', 'tagliatelle', 'linguine', 'fettuccine', 'rigatoni', 'farfalle', 'fusilli', 'lasagne', 'lasagna', 'macaroni'],
  'spaghetti':         ['pasta', 'bolognese', 'carbonara', 'aglio e olio'],
  'mac and cheese':    ['macaroni cheese', 'mac n cheese', 'macaroni and cheese', 'cheesy pasta'],
  'ramen':             ['noodles', 'noodle soup', 'japanese noodles'],

  // ─── Breads & Flatbreads ──────────────────────────────────────────────────────
  'naan':              ['bread', 'garlic naan', 'peshwari naan', 'chapati', 'roti', 'paratha', 'flatbread'],
  'chapati':           ['roti', 'naan', 'flatbread', 'chapatti'],
  'roti':              ['chapati', 'naan', 'paratha', 'flatbread', 'bread'],
  'paratha':           ['roti', 'chapati', 'flatbread', 'bread', 'stuffed paratha'],
  'bread':             ['naan', 'roti', 'chapati', 'paratha', 'toast', 'bun', 'roll', 'bap', 'barm'],
  'pita':              ['pitta', 'flatbread', 'wrap', 'bread'],
  'pitta':             ['pita', 'flatbread', 'wrap'],

  // ─── Burgers & Sandwiches ────────────────────────────────────────────────────
  'burger':            ['patty', 'beef burger', 'chicken burger', 'veggie burger', 'smash burger', 'bun', 'hamburger', 'cheeseburger'],
  'sandwich':          ['sub', 'wrap', 'baguette', 'panini', 'roll', 'bap', 'barm', 'hoagie', 'footlong'],
  'wrap':              ['sandwich', 'burrito', 'tortilla', 'rollup', 'flatbread wrap', 'durum wrap'],
  'sub':               ['sandwich', 'baguette', 'hoagie', 'footlong'],
  'panini':            ['sandwich', 'toasted sandwich', 'grilled sandwich'],

  // ─── Curries & Indian/South Asian ────────────────────────────────────────────
  'curry':             ['masala', 'tikka', 'korma', 'vindaloo', 'madras', 'balti', 'saag', 'bhuna', 'rogan josh', 'dopiaza', 'dhansak'],
  'masala':            ['curry', 'tikka masala', 'garam masala', 'butter masala'],
  'tikka':             ['chicken tikka', 'tikka masala', 'curry', 'masala', 'kebab'],
  'tikka masala':      ['curry', 'chicken tikka masala', 'masala'],
  'korma':             ['curry', 'mild curry', 'creamy curry'],
  'vindaloo':          ['curry', 'hot curry', 'spicy curry', 'goan curry'],
  'dal':               ['dhal', 'lentil', 'lentil soup', 'lentil curry', 'daal'],
  'dhal':              ['dal', 'lentil', 'lentil curry', 'daal'],
  'samosa':            ['samoosa', 'snack', 'starter', 'pastry'],
  'bhaji':             ['onion bhaji', 'bhajee', 'pakora', 'fritter', 'starter'],
  'pakora':            ['bhaji', 'fritter', 'starter', 'snack'],
  'aloo':              ['potato', 'potatoes', 'chips', 'fries'],
  'potato':            ['aloo', 'chips', 'fries', 'mash', 'jacket potato', 'roast potato'],
  'paneer':            ['cottage cheese', 'indian cheese', 'cheese'],
  'saag':              ['spinach', 'spinach curry', 'palak'],
  'palak':             ['saag', 'spinach', 'spinach curry'],

  // ─── Middle Eastern & Levantine ───────────────────────────────────────────────
  'kebab':             ['doner', 'shish', 'kofte', 'kofta', 'seekh', 'shawarma', 'gyros', 'doner kebab', 'mixed grill'],
  'doner':             ['kebab', 'doner kebab', 'shawarma', 'gyros'],
  'shawarma':          ['kebab', 'doner', 'wrap', 'gyros'],
  'falafel':           ['chickpea fritter', 'vegetarian', 'vegan', 'middle eastern'],
  'hummus':            ['chickpea dip', 'dip', 'mezze'],
  'mezze':             ['starter', 'appetizer', 'dips', 'sharing platter', 'tapas', 'small plate'],

  // ─── Sharing Platters ─────────────────────────────────────────────────────────
  'sharing platter':   ['mezze', 'tapas', 'sharing board', 'party platter', 'combo', 'mixed platter', 'platter', 'sharing starter', 'mixed grill platter'],
  'sharing board':     ['sharing platter', 'tapas', 'mezze', 'party platter'],
  'platter':           ['sharing platter', 'party platter', 'mixed platter', 'mezze'],
  'tapas':             ['small plate', 'sharing platter', 'mezze', 'appetizer', 'starter'],

  // ─── Spicy Food ────────────────────────────────────────────────────────────────
  'spicy':             ['hot', 'chilli', 'chili', 'piri piri', 'jalapeño', 'habanero', 'sriracha', 'vindaloo', 'extra hot', 'fiery', 'spiced'],
  'hot':               ['spicy', 'chilli', 'chili', 'extra hot', 'fiery'],

  // ─── Pizza ────────────────────────────────────────────────────────────────────
  'pizza':             ['margherita', 'calzone', 'flatbread pizza', 'neapolitan', 'pepperoni pizza', 'cheese pizza'],
  'margherita':        ['pizza', 'cheese pizza', 'tomato pizza'],
  'calzone':           ['pizza', 'folded pizza'],

  // ─── Chicken ─────────────────────────────────────────────────────────────────
  'chicken':           ['poultry', 'grilled chicken', 'chicken tikka', 'fried chicken', 'roast chicken', 'chicken wings', 'breast', 'thigh'],
  'fried chicken':     ['chicken', 'crispy chicken', 'southern fried', 'KFC style', 'buttermilk chicken', 'chicken wings'],
  'chicken wings':     ['wings', 'buffalo wings', 'chicken', 'fried chicken'],
  'wings':             ['chicken wings', 'buffalo wings', 'hot wings'],

  // ─── Beef & Steak ────────────────────────────────────────────────────────────
  'steak':             ['beef', 'sirloin', 'ribeye', 'fillet', 'rump', 'T-bone', 'striploin'],
  'beef':              ['steak', 'minced beef', 'ground beef', 'burger', 'brisket'],

  // ─── Fish & Seafood ───────────────────────────────────────────────────────────
  'fish':              ['cod', 'salmon', 'haddock', 'sea bass', 'tuna', 'tilapia', 'mackerel', 'trout', 'halibut'],
  'fish and chips':    ['fish chips', 'battered fish', 'cod and chips', 'haddock and chips'],
  'prawn':             ['shrimp', 'king prawn', 'tiger prawn', 'scampi', 'prawns'],
  'shrimp':            ['prawn', 'king prawn', 'tiger prawn', 'scampi'],
  'seafood':           ['fish', 'prawn', 'shrimp', 'squid', 'calamari', 'lobster', 'crab', 'mussels'],
  'calamari':          ['squid', 'fried squid', 'seafood'],
  'squid':             ['calamari', 'fried squid', 'seafood'],

  // ─── Lamb & Mutton ────────────────────────────────────────────────────────────
  'lamb':              ['mutton', 'lamb chops', 'rack of lamb', 'slow roast lamb', 'shish'],
  'mutton':            ['lamb', 'goat', 'slow cooked lamb'],
  'goat':              ['mutton', 'lamb', 'goat curry'],

  // ─── Vegetarian & Vegan Dishes ────────────────────────────────────────────────
  'salad':             ['leaves', 'coleslaw', 'caesar salad', 'greek salad', 'mixed salad', 'garden salad', 'house salad'],
  'veggie burger':     ['vegetarian burger', 'vegan burger', 'plant based burger', 'bean burger'],
  'vegetable curry':   ['veg curry', 'mixed vegetable curry', 'sabzi'],
  'veggie':            ['vegetarian', 'vegan', 'plant based'],

  // ─── Soups & Starters ────────────────────────────────────────────────────────
  'soup':              ['broth', 'bisque', 'chowder', 'laksa', 'tom yum', 'minestrone', 'lentil soup', 'tomato soup'],
  'starter':           ['appetizer', 'starter course', 'small plate', 'mezze', 'tapas', 'sharing plate'],

  // ─── Breakfast ────────────────────────────────────────────────────────────────
  'full english':      ['full breakfast', 'fry up', 'english breakfast', 'cooked breakfast', 'full fry'],
  'fry up':            ['full english', 'full breakfast', 'cooked breakfast', 'breakfast'],
  'eggs':              ['omelette', 'scrambled eggs', 'poached eggs', 'fried eggs', 'boiled eggs', 'benedict'],
  'pancakes':          ['crepes', 'american pancakes', 'waffles'],
  'waffles':           ['pancakes', 'belgian waffles', 'breakfast'],

  // ─── Desserts ─────────────────────────────────────────────────────────────────
  'cake':              ['cheesecake', 'chocolate cake', 'sponge', 'traybake', 'brownie', 'pastry'],
  'ice cream':         ['gelato', 'sorbet', 'frozen yoghurt', 'sundae', 'soft serve'],
  'cheesecake':        ['cake', 'dessert', 'baked cheesecake', 'new york cheesecake'],
  'brownie':           ['chocolate brownie', 'cake', 'dessert'],

  // ─── Drinks ───────────────────────────────────────────────────────────────────
  'coffee':            ['espresso', 'latte', 'cappuccino', 'americano', 'flat white', 'macchiato', 'mocha', 'filter coffee'],
  'latte':             ['coffee', 'cafe latte', 'milky coffee'],
  'cappuccino':        ['coffee', 'frothy coffee'],
  'tea':               ['chai', 'green tea', 'herbal tea', 'masala chai', 'english breakfast tea', 'earl grey'],
  'chai':              ['tea', 'masala chai', 'spiced tea', 'indian tea'],
  'juice':             ['orange juice', 'apple juice', 'fresh juice', 'smoothie', 'cold press'],
  'smoothie':          ['juice', 'blend', 'shake', 'fruit smoothie'],
  'milkshake':         ['shake', 'smoothie', 'thick shake'],
  'soda':              ['soft drink', 'fizzy drink', 'pop', 'cola', 'lemonade', 'fizzy'],
  'soft drink':        ['soda', 'fizzy drink', 'pop', 'cola', 'lemonade'],
  'coke':              ['cola', 'coca-cola', 'soft drink', 'fizzy drink'],
  'coca-cola':         ['coke', 'cola', 'soft drink'],
  'cola':              ['coke', 'coca-cola', 'pepsi', 'soft drink'],
  'lemonade':          ['soft drink', 'fizzy drink', 'lemon drink'],
  'lassi':             ['yoghurt drink', 'mango lassi', 'sweet lassi', 'salty lassi', 'indian drink'],
  'water':             ['still water', 'sparkling water', 'mineral water'],

  // ─── BBQ & Grill ─────────────────────────────────────────────────────────────
  'bbq':               ['barbecue', 'grilled', 'smoky', 'barbeque', 'chargrilled'],
  'barbecue':          ['bbq', 'barbeque', 'grilled', 'smoky', 'chargrilled'],
  'mixed grill':       ['grill platter', 'kebab', 'bbq', 'barbecue', 'mixed kebab'],

  // ─── Dietary Terms ────────────────────────────────────────────────────────────
  'halal':             ['muslim friendly', 'halaal', 'zabiha'],
  'muslim friendly':   ['halal', 'halaal'],
  'vegetarian':        ['veggie', 'veg', 'no meat', 'plant based'],
  'vegan':             ['plant based', 'plant-based', 'dairy free', 'no animal products', 'veggie'],
  'plant based':       ['vegan', 'plant-based', 'vegetarian'],
  'gluten free':       ['gluten-free', 'GF', 'coeliac', 'wheat free'],
  'gluten-free':       ['gluten free', 'GF', 'coeliac', 'wheat free'],
  'dairy free':        ['dairy-free', 'lactose free', 'non-dairy', 'vegan'],
  'nut free':          ['nut-free', 'no nuts', 'allergen free'],
  'kosher':            ['jewish food', 'kosher certified'],
  'organic':           ['natural', 'farm fresh', 'locally sourced'],

  // ─── Generic Category Synonyms ────────────────────────────────────────────────
  'restaurant':        ['eatery', 'diner', 'dining', 'takeaway', 'takeout', 'food', 'bistro'],
  'cafe':              ['coffee shop', 'coffee house', 'tea room', 'bakery cafe'],
  'takeaway':          ['takeout', 'delivery', 'collection', 'to go'],
  'delivery':          ['takeaway', 'takeout', 'home delivery', 'food delivery'],
};

// ─── Build Bidirectional Synonym Map ──────────────────────────────────────────

/**
 * Builds a fully expanded bidirectional map.
 * e.g., If fries→[chips, wedges], then chips→[...chips synonyms, fries, wedges] too.
 */
function buildBidirectionalMap(raw) {
  const map = new Map();

  // First pass: add all entries as-is
  for (const [term, synonyms] of Object.entries(raw)) {
    const key = term.toLowerCase().trim();
    if (!map.has(key)) map.set(key, new Set());
    for (const s of synonyms) {
      map.get(key).add(s.toLowerCase().trim());
    }
  }

  // Second pass: add reverse mappings
  for (const [term, synonyms] of Object.entries(raw)) {
    const key = term.toLowerCase().trim();
    for (const syn of synonyms) {
      const synKey = syn.toLowerCase().trim();
      if (!map.has(synKey)) map.set(synKey, new Set());
      // Point syn → original term and all other synonyms of that term
      map.get(synKey).add(key);
      for (const otherSyn of synonyms) {
        if (otherSyn !== syn) {
          map.get(synKey).add(otherSyn.toLowerCase().trim());
        }
      }
    }
  }

  return map;
}

const SYNONYM_MAP = buildBidirectionalMap(RAW_SYNONYMS);

// ─── Spell Correction Dictionary ──────────────────────────────────────────────
//
// Common misspellings → correct term.
// All keys are lowercase misspellings. Values are the corrected term.

const SPELL_CORRECTIONS = {
  // Chicken
  'chiken':         'chicken',
  'chciken':        'chicken',
  'chickne':        'chicken',
  'chiicken':       'chicken',
  'chikken':        'chicken',
  'chcken':         'chicken',

  // Fried
  'frid':           'fried',
  'freied':         'fried',
  'freid':          'fried',

  // Rice
  'rce':            'rice',
  'ric':            'rice',
  'ricee':          'rice',

  // Fried rice
  'frid rice':      'fried rice',
  'freid rice':     'fried rice',
  'chiken frid rice': 'chicken fried rice',
  'fride rice':     'fried rice',

  // Burger
  'burgur':         'burger',
  'burgar':         'burger',
  'burgerr':        'burger',

  // Pizza
  'piza':           'pizza',
  'pizzza':         'pizza',
  'pizaa':          'pizza',

  // Kebab
  'kebap':          'kebab',
  'kebbab':         'kebab',
  'kebabb':         'kebab',

  // Biryani
  'biriyani':       'biryani',
  'biriani':        'biryani',
  'biryaani':       'biryani',
  'briyana':        'biryani',
  'briyani':        'biryani',
  'baryani':        'biryani',

  // Noodles
  'noodls':         'noodles',
  'noodels':        'noodles',
  'nudls':          'noodles',

  // Chow mein
  'chowmin':        'chow mein',
  'chow min':       'chow mein',
  'chow mein':      'chow mein',

  // Halal
  'halel':          'halal',
  'halaal':         'halal',
  'halall':         'halal',
  'hala':           'halal',

  // Vegetarian
  'vegitarian':     'vegetarian',
  'vegeterian':     'vegetarian',
  'vegatarian':     'vegetarian',
  'vegiterian':     'vegetarian',
  'vegetarean':     'vegetarian',
  'veg':            'vegetarian',

  // Vegan
  'veegan':         'vegan',
  'vegaan':         'vegan',

  // Gluten
  'glutan':         'gluten',
  'glutten':        'gluten',
  'glutin':         'gluten',

  // Restaurant
  'restarant':      'restaurant',
  'resterant':      'restaurant',
  'restrant':       'restaurant',
  'resturant':      'restaurant',
  'restuarant':     'restaurant',
  'restraurant':    'restaurant',

  // Coffee
  'cofee':          'coffee',
  'coffe':          'coffee',
  'caffee':         'coffee',

  // Curry
  'cury':           'curry',
  'currry':         'curry',

  // Samosa
  'samossa':        'samosa',
  'samoosa':        'samosa',

  // Shawarma
  'shawerma':       'shawarma',
  'shawarma':       'shawarma',
  'sharwarma':      'shawarma',

  // Hummus
  'houmous':        'hummus',
  'hoummus':        'hummus',
  'humus':          'hummus',

  // Falafel
  'falaffle':       'falafel',
  'felefel':        'falafel',

  // Prawn
  'prawn':          'prawn',
  'pawn':           'prawn',

  // Sandwich
  'sandwhich':      'sandwich',
  'sandwitch':      'sandwich',
  'sandwch':        'sandwich',

  // Spaghetti
  'spagetti':       'spaghetti',
  'spagetti':       'spaghetti',
  'spaggetti':      'spaghetti',
  'spahgetti':      'spaghetti',

  // Tikka
  'tika':           'tikka',
  'tikka':          'tikka',

  // Paneer
  'panner':         'paneer',
  'panneer':        'paneer',
  'panir':          'paneer',

  // Chapati
  'chapatti':       'chapati',
  'chappati':       'chapati',
  'chapatti':       'chapati',

  // Doner
  'donner':         'doner',
  'donner kebab':   'doner kebab',
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Expand an array of keywords to include all synonyms.
 * Returns deduplicated array of all terms including originals.
 *
 * @param {string[]} keywords - e.g., ['fried rice', 'chicken']
 * @returns {string[]} - All terms including synonyms
 *
 * @example
 * expandSynonyms(['fried rice'])
 * // → ['fried rice', 'egg fried rice', 'veg fried rice', 'pilau', 'pilaf', 'rice', ...]
 */
function expandSynonyms(keywords) {
  if (!keywords || keywords.length === 0) return [];

  const allTerms = new Set();
  for (const kw of keywords) {
    const lower = kw.toLowerCase().trim();
    allTerms.add(lower);

    const synonyms = SYNONYM_MAP.get(lower);
    if (synonyms) {
      for (const syn of synonyms) {
        allTerms.add(syn);
      }
    }
  }

  return [...allTerms];
}

/**
 * Get synonyms for a single keyword.
 * Returns array of synonyms, or empty array if none found.
 *
 * @param {string} keyword
 * @returns {string[]}
 */
function getSynonyms(keyword) {
  if (!keyword) return [];
  const lower = keyword.toLowerCase().trim();
  const synonyms = SYNONYM_MAP.get(lower);
  return synonyms ? [...synonyms] : [];
}

/**
 * Correct the spelling of a word or short phrase.
 * Returns the corrected term, or the original if no correction found.
 *
 * @param {string} word
 * @returns {string} - Corrected word or original
 *
 * @example
 * correctSpelling('chiken')  → 'chicken'
 * correctSpelling('frid rice') → 'fried rice'
 * correctSpelling('pizza')   → 'pizza' (no change)
 */
function correctSpelling(word) {
  if (!word) return word;
  const lower = word.toLowerCase().trim();
  return SPELL_CORRECTIONS[lower] || word;
}

/**
 * Correct each word in an array of keywords.
 * Also attempts to correct multi-word phrases.
 *
 * @param {string[]} keywords
 * @returns {string[]}
 */
function correctKeywords(keywords) {
  if (!keywords || keywords.length === 0) return [];
  // Try full phrase correction first (handles "frid rice" → "fried rice")
  const fullPhrase = keywords.join(' ').toLowerCase();
  const phraseCorrection = SPELL_CORRECTIONS[fullPhrase];
  if (phraseCorrection) {
    return [phraseCorrection];
  }
  // Otherwise correct each word individually
  return keywords.map(k => correctSpelling(k));
}

/**
 * Check if a given term has any synonyms in the dictionary.
 */
function hasSynonyms(keyword) {
  if (!keyword) return false;
  return SYNONYM_MAP.has(keyword.toLowerCase().trim());
}

module.exports = {
  expandSynonyms,
  getSynonyms,
  correctSpelling,
  correctKeywords,
  hasSynonyms,
  SYNONYM_MAP,
  SPELL_CORRECTIONS,
};
