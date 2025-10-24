const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    maxlength: [100, 'Business name cannot be more than 100 characters']
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    full: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  categories: [{
    type: String,
    trim: true
  }],
  gallery: [{
    url: String,
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  hours: {
    monday: { open: String, close: String, closed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
    friday: { open: String, close: String, closed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, closed: { type: Boolean, default: false } }
  },
  contact: {
    phone: String,
    email: String,
    website: String
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  features: [{
    type: String,
    enum: ['delivery', 'pickup', 'dine-in', 'outdoor-seating', 'wifi', 'parking', 'wheelchair-accessible']
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Geospatial index for location-based queries
businessSchema.index({ location: '2dsphere' });

// Text index for search
businessSchema.index({ 
  name: 'text', 
  description: 'text', 
  'address.full': 'text',
  categories: 'text'
});

// Other indexes
businessSchema.index({ ownerId: 1 });
businessSchema.index({ status: 1 });
businessSchema.index({ rating: -1 });
businessSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Business', businessSchema);
