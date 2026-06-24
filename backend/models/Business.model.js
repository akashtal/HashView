const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Business name is required'],
    trim: true,
    minlength: [2, 'Business name must be at least 2 characters'],
    maxlength: [100, 'Business name cannot exceed 100 characters']
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusinessOwner'
    // Optional — admin can create/import businesses without an owner.
    // Owner is set when a real user registers or claims this business.
  },
  importedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
    // Set when an admin bulk-uploads this business via Excel import.
    // Tracks who seeded the data; NOT the business owner.
  },
  ownerName: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
    // Optional - admin can create businesses without email
  },
  phone: {
    type: String
    // Optional - admin can create businesses without phone
  },
  category: {
    type: String,
    required: [true, 'Business category is required'],
    trim: true
    // Note: Categories are now managed dynamically via the Category model
    // Admin can add/remove categories without code changes
  },
  description: {
    type: String,
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  address: {
    buildingNumber: String,  // UK: Building/House number
    street: String,          // Street name
    area: String,            // Locality/Area (optional, for backwards compatibility)
    city: String,            // Town/City
    county: String,          // UK: County (optional)
    state: String,           // State/Province (for other countries)
    country: { type: String, default: 'United Kingdom' },  // Default UK
    postcode: String,        // UK: Postcode
    zipCode: String,         // US/Other: ZIP code (alias)
    pincode: String,         // India: PIN code (for backwards compatibility)
    landmark: String,        // Nearby landmark
    fullAddress: String      // Complete formatted address
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function (v) {
          return Array.isArray(v) && v.length === 2 &&
            v[0] >= -180 && v[0] <= 180 && // longitude
            v[1] >= -90 && v[1] <= 90;     // latitude
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, Latitude must be between -90 and 90'
      }
    }
  },
  radius: {
    type: Number,
    default: 50, // 50 meters default radius for geofencing
    min: 10,
    max: 500
  },
  orderRadius: {
    type: Number,
    default: 50, // 50 meters default radius for ordering food
    min: 10,
    max: 500
  },
  images: [{
    url: String,
    publicId: String
  }],
  logo: {
    url: String,
    publicId: String
  },
  coverImage: {
    url: String,
    publicId: String
  },
  selfieUrl: String, // Owner selfie for face matching
  selfiePublicId: String,

  documents: {
    ownerIdProof: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    addressProof: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    selfie: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    businessLicense: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    },
    foodSafetyCertificate: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false },
      status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
      rejectionReason: String
    }
  },

  submittedForReviewAt: Date, // When documents were submitted

  // Didit Verification Removed
  // diditVerification: { ... }

  // KYC Status
  kycStatus: {
    type: String,
    enum: ['pending', 'in_review', 'verified', 'approved', 'rejected'],
    default: 'approved'
  },

  // Admin verification (after Didit)
  adminVerification: {
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    notes: String,
    rejectionReason: String
  },

  status: {
    type: String,
    enum: ['pending', 'active', 'inactive', 'suspended', 'rejected'],
    default: 'pending'
  },
  qrCode: {
    type: String,
    default: null
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
  reviewCount: {
    type: Number,
    default: 0
  },
  openingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },
  socialMedia: {
    website: String
  },
  externalProfiles: {
    tripAdvisor: {
      profileUrl: String,
      lastSynced: Date,
      commonNinjaWidgetId: String, // Common Ninja widget ID for TripAdvisor reviews
      commonNinjaWidgetUrl: String // Widget URL for embedding
    },
    googleBusiness: {
      businessName: String,
      placeId: String, // Google Place ID
      rating: Number,
      reviewCount: Number,
      lastSynced: Date
    }
  },
  externalReviews: {
    tripAdvisor: [{
      reviewId: String,
      author: String,
      authorPhoto: String,
      rating: Number,
      text: String,
      title: String,
      date: Date,
      url: String,
      helpful: Number
    }],
    google: [{
      reviewId: String,
      author: String,
      authorPhoto: String,
      rating: Number,
      text: String,
      date: Date,
      relativeTime: String
    }]
  },
  rejectionReason: String,
  verifiedAt: Date,
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Last review timestamp — updated whenever a new review is submitted
  lastReviewAt: {
    type: Date,
    default: null
  },
  
  // Custom display order for menu categories
  menuCategoryOrder: [{
    type: String
  }],

  // Profile Visit Analytics
  visitCount: {
    type: Number,
    default: 0,
    min: 0
  },

  // Business Claim System
  claimRequest: {
    status: {
      type: String,
      enum: ['none', 'incomplete', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    requestedAt: Date,
    businessEmail: String,
    role: { type: String, enum: ['owner', 'manager', 'other'] },
    agreedToTerms: { type: Boolean, default: false },
    verificationMethod: { type: String, enum: ['document', 'phone'] },
    phoneVerified: { type: Boolean, default: false },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    rejectionReason: String
  }
}, {
  timestamps: true
});

// Index for geospatial queries
businessSchema.index({ location: '2dsphere' }, { sparse: true });
businessSchema.index({ owner: 1 });
businessSchema.index({ category: 1 });
businessSchema.index({ status: 1 });

module.exports = mongoose.model('Business', businessSchema);

