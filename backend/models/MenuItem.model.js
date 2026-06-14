const mongoose = require('mongoose');
const { classifyMealTime } = require('../ai-gateway/utils/meal_classifier');

const menuItemSchema = new mongoose.Schema({
  // ─── Relationship ────────────────────────────────────────────────────────────
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business reference is required'],
    index: true
  },

  // ─── Core Fields ─────────────────────────────────────────────────────────────
  name: {
    type: String,
    required: [true, 'Item name is required'],
    trim: true,
    maxlength: [100, 'Item name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative']
  },
  currency: {
    type: String,
    default: 'GBP',
    enum: ['GBP', 'USD', 'EUR', 'INR', 'AED', 'CAD', 'AUD'],
    uppercase: true
  },

  // ─── Categorisation ──────────────────────────────────────────────────────────
  // The category within the menu/service list (e.g. "Starters", "Main Course",
  // "Haircut", "Rooms"). NOT the Business category (restaurant/salon/hotel).
  menuCategory: {
    type: String,
    trim: true,
    maxlength: [60, 'Menu category cannot exceed 60 characters']
  },

  // The type of item — governs which additional fields are shown in the UI
  type: {
    type: String,
    enum: ['food', 'drink', 'service', 'product', 'package', 'room'],
    default: 'food'
  },

  // Free-form tags for AI keyword search (e.g. ["chicken", "spicy", "curry", "halal"])
  tags: {
    type: [String],
    default: []
  },

  // ─── Dietary / Attribute Labels ───────────────────────────────────────────────
  // Applicable for food & drinks. Used by AI to filter dietary queries.
  dietary: {
    type: [String],
    enum: ['vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-free', 'kosher', 'organic'],
    default: []
  },

  // ─── Availability ─────────────────────────────────────────────────────────────
  isAvailable: {
    type: Boolean,
    default: true
  },
  // Days this item is available (empty = every day)
  availableDays: {
    type: [String],
    enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    default: []
  },
  // Time slots this item is available (e.g. dinner menu: [{start:"17:00",end:"22:00"}])
  availableTimeSlots: [{
    start: { type: String }, // "HH:MM" 24-hour format
    end: { type: String }    // "HH:MM" 24-hour format
  }],

  // ─── Media ────────────────────────────────────────────────────────────────────
  image: {
    url: { type: String },
    publicId: { type: String } // Cloudinary public ID for deletion
  },

  // ─── Display Controls ─────────────────────────────────────────────────────────
  isPopular: {
    type: Boolean,
    default: false   // Business owner marks as "Popular" — shown with a badge
  },
  isFeatured: {
    type: Boolean,
    default: false   // Shown at the top of the category section
  },
  sortOrder: {
    type: Number,
    default: 0       // Lower = shown first within the same menuCategory
  },

  // ─── Service-Specific Fields ──────────────────────────────────────────────────
  // Applicable to type: 'service' (salons, spas, gyms etc.)
  duration: {
    type: Number,    // Duration in minutes (e.g. 45 for a haircut)
    min: [1, 'Duration must be at least 1 minute']
  },

  // ─── Status ───────────────────────────────────────────────────────────────────
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },

  // ─── AI Meal-Time Classification ──────────────────────────────────────────────
  // System-assigned based on food name, description, and category.
  // Values: 'breakfast' | 'lunch' | 'dinner' | 'all-day'
  // Automatically set on save — business owners do NOT need to set this manually.
  // An item can belong to multiple meal times (e.g. soup = ['lunch', 'dinner']).
  suggestedMealTimes: {
    type: [String],
    enum: ['breakfast', 'lunch', 'dinner', 'all-day'],
    default: []
  },

  // ─── Ordering-Specific Fields (Phase 2) ───────────────────────────────────────
  modifiers: [{
    name: { type: String, required: true },      // e.g., "Size", "Spice Level"
    required: { type: Boolean, default: false },
    maxSelections: { type: Number, default: 1 },
    options: [{
      name: { type: String, required: true },    // e.g., "Small", "Medium"
      priceAdjustment: { type: Number, default: 0 },
      isDefault: { type: Boolean, default: false }
    }]
  }],

  addOns: [{
    name: { type: String, required: true },      // e.g., "Extra Cheese"
    price: { type: Number, required: true },
    isAvailable: { type: Boolean, default: true },
    maxQuantity: { type: Number, default: 5 }
  }],

  prepTime: {
    type: Number,
    default: 15,
    min: 1,
    max: 120
  },

  maxOrdersPerSlot: {
    type: Number,
    default: null
  },

  allergens: {
    type: [String],
    enum: [
      'celery', 'gluten', 'crustaceans', 'eggs', 'fish', 'lupin',
      'milk', 'molluscs', 'mustard', 'nuts', 'peanuts', 'sesame',
      'soybeans', 'sulphites'
    ],
    default: []
  },

  calories: {
    type: Number,
    default: null
  }

}, {
  timestamps: true
});

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Compound index: fetch all items for a business filtered by status/type (most common query)
menuItemSchema.index({ business: 1, status: 1, type: 1 });

// Compound index: AI price filter queries (business + available price range)
menuItemSchema.index({ business: 1, price: 1, status: 1 });

// Full-text search index: AI keyword search on name, description, and tags
// Allows queries like: "chicken", "tikka masala", "hair colour"
menuItemSchema.index(
  { name: 'text', description: 'text', tags: 'text' },
  {
    weights: { name: 10, tags: 7, description: 3 }, // name match is most important
    name: 'menuitem_text_search'
  }
);

// Price index: AI range queries (e.g. "under £15" → { price: { $lte: 15 } })
menuItemSchema.index({ price: 1 });

// Tags index: direct tag lookups (e.g. ["halal", "chicken"])
menuItemSchema.index({ tags: 1 });

// Meal-time index: AI meal-time filtering (e.g. "dinner near me")
menuItemSchema.index({ business: 1, suggestedMealTimes: 1, status: 1 });

// Display order index: sort within a menu category
menuItemSchema.index({ business: 1, menuCategory: 1, sortOrder: 1 });

// ─── Pre-Save Hook: Auto-classify meal time ───────────────────────────────────

menuItemSchema.pre('save', function (next) {
  // Only classify food/drink types — skip services, rooms, products
  if (!['food', 'drink'].includes(this.type)) {
    this.suggestedMealTimes = ['all-day'];
    return next();
  }

  // Re-classify whenever the name, description, category, or time slots change
  const changed = this.isNew ||
    this.isModified('name') ||
    this.isModified('description') ||
    this.isModified('menuCategory') ||
    this.isModified('availableTimeSlots') ||
    this.suggestedMealTimes.length === 0;

  if (changed) {
    try {
      const classified = classifyMealTime({
        name:               this.name,
        description:        this.description,
        tags:               this.tags,
        menuCategory:       this.menuCategory,
        type:               this.type,
        availableTimeSlots: this.availableTimeSlots,
      });
      this.suggestedMealTimes = classified;
    } catch {
      // Non-fatal: default to all-day if classifier throws
      this.suggestedMealTimes = ['all-day'];
    }
  }

  next();
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
