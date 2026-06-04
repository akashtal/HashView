/**
 * Meal-Time Food Classifier
 *
 * Determines which meal time(s) a menu item belongs to based on its name,
 * description, tags, and menu category — WITHOUT requiring the business to
 * explicitly label it "Breakfast / Lunch / Dinner".
 *
 * Coverage: UK pub/restaurant food + South Asian (Indian/Pakistani/Bangladeshi)
 * cuisine — the two dominant food cultures on the HashView platform.
 *
 * Classification logic (in order of priority):
 *   1. Check menuCategory for explicit meal-time words
 *   2. Check item name against the food knowledge dictionaries
 *   3. Check description and tags for additional signals
 *   4. Fall back to "all-day" when uncertain
 *
 * Output: string[] — one or more of: 'breakfast', 'lunch', 'dinner', 'all-day'
 *
 * Design goals:
 *   - Conservative: when uncertain → 'all-day' (better to show than hide)
 *   - Biased toward UK + Indian/Pakistani food culture
 *   - Fast: pure string matching, no AI call needed for classification
 */

// ─── Food Knowledge Base ──────────────────────────────────────────────────────

/**
 * Foods strongly associated with DINNER / evening meals.
 * UK restaurant + Indian/Pakistani/Bangladeshi cuisine.
 */
const DINNER_FOODS = [
  // Indian/Pakistani/Bangladeshi mains
  'biryani', 'dum biryani', 'chicken biryani', 'lamb biryani', 'prawn biryani',
  'mutton biryani', 'veg biryani', 'hyderabadi biryani', 'pilau', 'pulao',
  'butter chicken', 'chicken tikka masala', 'tikka masala', 'murgh makhani',
  'chicken curry', 'lamb curry', 'mutton curry', 'beef curry', 'prawn curry',
  'fish curry', 'vegetable curry', 'mixed curry', 'dal makhani', 'dal tadka',
  'dhal makhani', 'saag paneer', 'palak paneer', 'paneer tikka', 'shahi paneer',
  'paneer butter masala', 'aloo gobi', 'aloo mutter', 'chana masala',
  'chole', 'chole bhature', 'rajma', 'kadai paneer', 'kadai chicken',
  'chicken korma', 'lamb korma', 'korma', 'chicken rogan josh', 'rogan josh',
  'chicken vindaloo', 'lamb vindaloo', 'vindaloo', 'chicken madras', 'madras',
  'chicken balti', 'lamb balti', 'balti', 'chicken pathia', 'dopiaza',
  'nihari', 'haleem', 'karahi', 'chicken karahi', 'lamb karahi', 'mutton karahi',
  'chicken handi', 'paya', 'kofta curry', 'seekh kofta', 'shami kebab',
  'baingan bharta', 'achari chicken', 'amritsari fish', 'kadala curry',
  'fish masala', 'bhindi masala', 'mixed vegetable curry',
  // Kebabs and grills
  'seekh kebab', 'shish kebab', 'kofte', 'kofta', 'doner kebab', 'doner',
  'chicken doner', 'lamb doner', 'shawarma', 'chicken shawarma', 'lamb shawarma',
  'mixed grill', 'shish', 'chicken shish', 'lamb shish', 'chapli kebab',
  'piri piri chicken', 'peri peri chicken', 'tandoori chicken', 'tandoori mixed grill',
  'tikka', 'chicken tikka', 'lamb tikka', 'seekh', 'grilled chicken', 'grilled lamb',
  'half chicken', 'whole chicken',
  // Rice dishes (dinner-style)
  'fried rice', 'egg fried rice', 'chicken fried rice', 'prawn fried rice',
  'beef fried rice', 'special fried rice', 'veg fried rice', 'mixed fried rice',
  'nasi goreng', 'yeung chow', 'steamed rice', 'plain rice',
  // Noodle dishes
  'chowmein', 'chow mein', 'chicken chowmein', 'beef chowmein', 'prawn chowmein',
  'veg chowmein', 'lo mein', 'fried noodles', 'stir fried noodles',
  'pad thai', 'ramen', 'udon', 'yakisoba', 'singapore noodles', 'ho fun',
  // UK/European dinner mains
  'steak', 'sirloin', 'ribeye', 'fillet steak', 'rump steak', 't-bone',
  'fish and chips', 'fish & chips', 'battered fish', 'mushy peas',
  'roast chicken', 'sunday roast', 'roast beef', 'roast lamb', 'roast pork',
  'roast dinner', 'chicken pie', 'steak pie', 'cottage pie', 'shepherds pie',
  "shepherd's pie", 'fish pie', 'chicken and mushroom pie', 'lasagne', 'lasagna',
  'moussaka', 'spaghetti bolognese', 'bolognese', 'carbonara', 'pasta bake',
  'penne arrabbiata', 'rigatoni', 'tagliatelle', 'linguine', 'fettuccine',
  'chicken parmesan', 'chicken parmigiana', 'chicken schnitzel', 'escalope',
  'duck confit', 'lamb shank', 'pork belly', 'slow roast', 'braised',
  'pizza', 'margherita', 'pepperoni', 'quattro formaggi', 'calzone',
  'burger', 'chicken burger', 'beef burger', 'smash burger', 'veggie burger',
  'halloumi burger', 'fish burger', 'double burger', 'cheeseburger',
  'bbq ribs', 'baby back ribs', 'spare ribs', 'ribs',
  'jerk chicken', 'ackee', 'curry goat', 'oxtail', 'rice and peas',
  // Chinese/Asian dinner
  'sweet and sour', 'kung pao', 'black bean', 'oyster sauce', 'szechuan',
  'mongolian beef', 'beef in black bean', 'chicken in black bean',
  'duck in plum sauce', 'crispy duck', 'peking duck', 'aromatic duck',
  'satay', 'chicken satay', 'beef satay', 'green curry', 'red curry',
  'massaman', 'thai green curry', 'thai red curry',
];

/**
 * Foods strongly associated with LUNCH / midday meals.
 */
const LUNCH_FOODS = [
  // Sandwiches and wraps
  'sandwich', 'baguette', 'sub', 'hoagie', 'club sandwich', 'blt', 'blat',
  'egg mayo sandwich', 'tuna mayo sandwich', 'ham sandwich', 'chicken sandwich',
  'wrap', 'chicken wrap', 'falafel wrap', 'halloumi wrap', 'breakfast wrap',
  'burrito', 'tortilla wrap', 'panini', 'ciabatta', 'focaccia', 'roll',
  // Light meals
  'soup', 'tomato soup', 'lentil soup', 'pea soup', 'minestrone', 'french onion soup',
  'salad', 'caesar salad', 'greek salad', 'nicoise', 'pasta salad', 'coleslaw',
  'jacket potato', 'baked potato', 'loaded potato', 'potato skins',
  'quiche', 'quiche lorraine', 'ploughman', "ploughman's", 'scotch egg',
  // Indian light meals
  'samosa', 'chaat', 'bhel puri', 'pani puri', 'gol gappa', 'aloo tikki',
  'dahi puri', 'papdi chaat', 'chole tikki', 'raj kachori',
  'pakora', 'onion bhaji', 'bhaji', 'kachori', 'dhokla', 'khandvi',
  'vada pav', 'pav bhaji', 'dabeli', 'missal pav', 'frankie',
  'lunch thali', 'dal rice', 'dal roti', 'sabji roti',
  // Lighter plates
  'spring roll', 'prawn toast', 'dim sum', 'dumpling', 'gyoza', 'potsticker',
  'hummus', 'falafel', 'mezze', 'pitta', 'flatbread', 'pita',
  'tapas', 'bruschetta', 'antipasti',
];

/**
 * Foods strongly associated with BREAKFAST / morning meals.
 */
const BREAKFAST_FOODS = [
  // Full English / Scottish / Irish / Welsh
  'full english', 'full breakfast', 'cooked breakfast', 'fry up', 'fry-up',
  'english breakfast', 'scottish breakfast', 'irish breakfast', 'welsh breakfast',
  'breakfast bap', 'breakfast roll', 'breakfast sandwich', 'breakfast muffin',
  'eggs benedict', 'eggs royale', 'eggs florentine', 'eggs arnold',
  'scrambled eggs', 'poached eggs', 'fried eggs', 'boiled eggs', 'dippy eggs',
  'omelette', 'plain omelette', 'cheese omelette', 'mushroom omelette',
  'hash browns', 'hash brown', 'hashbrown',
  'bacon sandwich', 'bacon roll', 'bacon bap', 'bacon baguette',
  'sausage sandwich', 'sausage roll', 'black pudding', 'white pudding',
  'smoked salmon and eggs', 'smoked salmon',
  'avocado toast', 'avocado on toast', 'avocado brunch',
  'pancakes', 'crepes', 'american pancakes', 'buttermilk pancakes',
  'waffles', 'french toast', 'eggy bread', 'pain perdu',
  'porridge', 'oatmeal', 'overnight oats',
  'muesli', 'granola', 'granola bowl', 'acai bowl', 'smoothie bowl',
  'fruit salad', 'fruit bowl', 'fruit platter',
  'toast', 'sourdough toast', 'marmalade on toast', 'jam on toast',
  'croissant', 'pain au chocolat', 'danish pastry', 'almond croissant',
  'bagel', 'cream cheese bagel', 'lox bagel',
  // Indian breakfast
  'idli', 'idly', 'dosa', 'masala dosa', 'plain dosa', 'rava dosa', 'uttapam',
  'upma', 'poha', 'puffed rice', 'aval', 'bread upma',
  'paratha', 'aloo paratha', 'gobhi paratha', 'mooli paratha', 'methi paratha',
  'puri', 'aloo puri', 'puri bhaji', 'puri sabji',
  'vada', 'medu vada', 'sambar vada', 'rava idli',
  'chole bhature', 'halwa puri', 'suji halwa', 'semolina porridge',
  'chai', 'masala chai', 'kadak chai', 'herbal tea',
  // Brunch-specific
  'brunch', 'brunch plate', 'brunch bowl', 'big brunch',
  'shakshuka', 'eggs shakshuka', 'huevos rancheros',
  'kedgeree', 'kipper', 'smoked haddock', 'baked beans on toast',
];

/**
 * Foods that are clearly NOT dinner (used as negative signals).
 * Useful for items with ambiguous names.
 */
const NOT_DINNER_SIGNALS = [
  'breakfast', 'morning', 'brunch', 'early bird',
  'cereal', 'porridge', 'muesli', 'granola',
  'fresh juice', 'smoothie', 'fruit juice',
];

/**
 * Category name patterns that indicate meal time explicitly.
 */
const CATEGORY_MEAL_HINTS = {
  breakfast: ['breakfast', 'brunch', 'morning', 'b&b', 'early bird', 'all day breakfast'],
  lunch:     ['lunch', 'midday', 'light bite', 'light lunch', 'lunch special', 'afternoon'],
  dinner:    ['dinner', 'evening', 'supper', 'evening menu', 'night', 'late night', 'a la carte'],
  // These are neutral — items within them can belong to any meal time
  neutral:   ['mains', 'main course', 'starters', 'specials', 'today\'s special', 'sides',
              'desserts', 'drinks', 'beverages', 'extras'],
};

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * Normalize a string for comparison — lowercase, strip punctuation, collapse whitespace.
 */
function normalize(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Check if text contains any of the given keywords (whole-word or phrase match).
 */
function containsAny(text, keywords) {
  const normalized = normalize(text);
  return keywords.some(kw => {
    const kwNorm = normalize(kw);
    // Match as word boundary (prevent "rice" matching "price")
    const regex = new RegExp(`(^|\\s|,)${kwNorm.replace(/\s+/g, '\\s+')}(\\s|,|$)`, 'i');
    return regex.test(normalized);
  });
}

/**
 * Classify a menu item into one or more meal times.
 *
 * @param {Object} item - MenuItem fields: name, description, tags, menuCategory, type, availableTimeSlots
 * @returns {string[]} - Array of meal times: ['breakfast'] | ['lunch'] | ['dinner'] | ['all-day']
 *                       Can return multiple if item is appropriate for more than one meal time.
 */
function classifyMealTime(item) {
  const { name = '', description = '', tags = [], menuCategory = '', type = 'food', availableTimeSlots = [] } = item;

  // Non-food items (services, rooms, products) are all-day
  if (!['food', 'drink'].includes(type)) {
    return ['all-day'];
  }

  // ─── Priority 1: Use availableTimeSlots if set by the business ────────────────
  if (availableTimeSlots && availableTimeSlots.length > 0) {
    const mealTimes = new Set();
    for (const slot of availableTimeSlots) {
      const startHour = parseInt((slot.start || '00:00').split(':')[0], 10);
      const endHour   = parseInt((slot.end   || '23:59').split(':')[0], 10);
      if (startHour >= 5  && endHour <= 12)  mealTimes.add('breakfast');
      if (startHour >= 11 && endHour <= 16)  mealTimes.add('lunch');
      if (startHour >= 17 || endHour >= 17)  mealTimes.add('dinner');
      if (startHour < 5)                     mealTimes.add('dinner'); // Late night = dinner
    }
    if (mealTimes.size > 0) return [...mealTimes];
  }

  // ─── Priority 2: Explicit category label ──────────────────────────────────────
  if (menuCategory) {
    const catLower = normalize(menuCategory);
    for (const [mealTime, hints] of Object.entries(CATEGORY_MEAL_HINTS)) {
      if (mealTime === 'neutral') continue;
      if (hints.some(hint => catLower.includes(normalize(hint)))) {
        return [mealTime];
      }
    }
  }

  // ─── Priority 3: Semantic food name matching ──────────────────────────────────
  const fullText = `${name} ${description} ${tags.join(' ')}`;
  const results  = new Set();

  if (containsAny(name, BREAKFAST_FOODS)) results.add('breakfast');
  if (containsAny(name, LUNCH_FOODS))     results.add('lunch');
  if (containsAny(name, DINNER_FOODS))    results.add('dinner');

  // Also check description and tags for additional context
  if (results.size === 0) {
    if (containsAny(fullText, BREAKFAST_FOODS)) results.add('breakfast');
    if (containsAny(fullText, LUNCH_FOODS))     results.add('lunch');
    if (containsAny(fullText, DINNER_FOODS))    results.add('dinner');
  }

  // ─── Priority 4: Drink classification ────────────────────────────────────────
  // Drinks are all-day unless paired with meal keywords
  if (type === 'drink' && results.size === 0) {
    return ['all-day'];
  }

  // If nothing matched, return 'all-day' (conservative — don't hide it)
  if (results.size === 0) {
    return ['all-day'];
  }

  return [...results];
}

/**
 * Get the semantic food keywords for a meal time.
 * Used by query_builder to filter items when no suggestedMealTimes is stored.
 * Returns a regex-compatible list of keywords.
 */
function getMealTimeKeywords(mealTime) {
  switch (mealTime) {
    case 'breakfast':
      return BREAKFAST_FOODS.slice(0, 40); // Top 40 most common
    case 'lunch':
      return LUNCH_FOODS.slice(0, 30);
    case 'dinner':
      return DINNER_FOODS.slice(0, 60);
    default:
      return [];
  }
}

module.exports = { classifyMealTime, getMealTimeKeywords, DINNER_FOODS, LUNCH_FOODS, BREAKFAST_FOODS };
