const mongoose = require('mongoose');

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

// Display order index: sort within a menu category
menuItemSchema.index({ business: 1, menuCategory: 1, sortOrder: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
