const Joi = require('joi');

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    console.log('\n🔍 Validation Check');
    console.log('Schema:', schema._ids || 'createBusiness');
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: false
    });

    if (error) {
      const errors = error.details.map(detail => {
        const errorMsg = `${detail.path.join('.')}: ${detail.message}`;
        console.log('❌ Validation Error:', errorMsg);
        return errorMsg;
      });

      console.log('📋 All Validation Errors:', errors);

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    console.log('✅ Validation passed');
    console.log('Validated Value:', JSON.stringify(value, null, 2));

    next();
  };
};

// Validation schemas
const schemas = {
  // Auth validations
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('', null).pattern(/^\+?[0-9]{7,15}$/).optional(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('customer', 'business').default('customer'),
    address: Joi.object({
      buildingNumber: Joi.string().allow('', null),
      street: Joi.string().allow('', null),
      city: Joi.string().allow('', null),
      county: Joi.string().allow('', null),
      postcode: Joi.string().allow('', null),
      country: Joi.string().allow('', null),
      landmark: Joi.string().allow('', null),
      fullAddress: Joi.string().allow('', null),
    }).optional(),
    buildingNumber: Joi.string().allow('', null),
    street: Joi.string().allow('', null),
    city: Joi.string().allow('', null),
    county: Joi.string().allow('', null),
    postcode: Joi.string().allow('', null),
    country: Joi.string().allow('', null),
    landmark: Joi.string().allow('', null)
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    role: Joi.string().valid('customer', 'business').optional()
  }),

  loginWithPhone: Joi.object({
    phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/).required(),
    otp: Joi.string().length(6).required()
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required()
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(6).required()
  }),

  resetPasswordOTP: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  }),

  // Review validation
  createReview: Joi.object({
    business: Joi.string().required(),
    rating: Joi.number().min(1).max(5).required(),
    comment: Joi.string().min(10).max(500).required(),
    emotion: Joi.string().valid(
      'happy', 'blessed', 'loved', 'sad', 'lovely', 'thankful',
      'excited', 'in_love', 'crazy', 'grateful', 'blissful',
      'fantastic', 'silly', 'festive', 'wonderful', 'cool',
      'amused', 'relaxed', 'positive', 'chill'
    ).optional(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    images: Joi.array().optional(),
    videos: Joi.array().optional(),
    // 🔒 Comprehensive security metadata (all optional)
    locationAccuracy: Joi.number().optional(),
    verificationTime: Joi.number().optional(),
    motionDetected: Joi.boolean().optional(),
    isMockLocation: Joi.boolean().optional(),
    locationHistoryCount: Joi.number().optional(),
    suspiciousActivities: Joi.array().optional(),
    deviceFingerprint: Joi.object().optional(),
    devicePlatform: Joi.string().optional()
  }),

  // Business validation
  createBusiness: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    ownerName: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().required(),
    phone: Joi.string()
      .custom((value, helpers) => {
        // Sanitize phone: remove spaces, dashes, parentheses
        const sanitized = value.replace(/[\s\-\(\)]/g, '');
        // Validate E.164 format: optional +, then 7-15 digits
        if (!/^\+?[0-9]{7,15}$/.test(sanitized)) {
          return helpers.error('any.invalid');
        }
        return sanitized; // Return sanitized value
      })
      .required()
      .messages({
        'any.invalid': 'Phone number must be in international format (e.g., +447123456789)',
        'any.required': 'Phone number is required'
      }),
    category: Joi.string().trim().min(2).max(50).required(), // Dynamic categories from database
    description: Joi.string().max(500).allow('', null).optional(),
    // Accept address as string OR structured object OR manual fields
    address: Joi.alternatives().try(
      Joi.string().allow(''),
      Joi.object({
        buildingNumber: Joi.string().allow('', null),
        street: Joi.string().optional(),
        area: Joi.string().optional(),
        city: Joi.string().optional(),
        county: Joi.string().allow('', null),
        state: Joi.string().optional(),
        country: Joi.string().optional(),
        postcode: Joi.string().allow('', null),
        zipCode: Joi.string().optional(),
        pincode: Joi.string().optional(),
        landmark: Joi.string().optional(),
        fullAddress: Joi.string().optional()
      })
    ).optional(),
    // Manual address fields (sent separately from address object)
    // Street, city, and postcode are REQUIRED for business registration
    buildingNumber: Joi.string().allow('', null).optional(),
    street: Joi.string().trim().min(1).required().messages({
      'string.empty': 'Street address is required',
      'any.required': 'Street address is required'
    }),
    area: Joi.string().allow('').optional(),
    city: Joi.string().trim().min(1).required().messages({
      'string.empty': 'City/Town is required',
      'any.required': 'City/Town is required'
    }),
    county: Joi.string().allow('', null).optional(),
    state: Joi.string().allow('').optional(),
    postcode: Joi.string().trim().min(1).required().messages({
      'string.empty': 'Postcode is required',
      'any.required': 'Postcode is required for business registration'
    }),
    country: Joi.string().allow('', null).optional(),
    pincode: Joi.string().allow('').optional(),
    landmark: Joi.string().allow('').optional(),
    latitude: Joi.number().min(-90).max(90).required(),
    longitude: Joi.number().min(-180).max(180).required(),
    radius: Joi.number().min(10).max(500).default(50).optional(),
    // Image fields (optional)
    logo: Joi.alternatives().try(
      Joi.string().uri(),
      Joi.string().allow(''),
      Joi.valid(null)
    ).optional(),
    logoPublicId: Joi.alternatives().try(
      Joi.string(),
      Joi.string().allow(''),
      Joi.valid(null)
    ).optional(),
    coverImage: Joi.alternatives().try(
      Joi.string().uri(),
      Joi.string().allow(''),
      Joi.valid(null)
    ).optional(),
    coverImagePublicId: Joi.alternatives().try(
      Joi.string(),
      Joi.string().allow(''),
      Joi.valid(null)
    ).optional(),
    images: Joi.alternatives().try(
      Joi.array().items(
        Joi.alternatives().try(
          Joi.string().uri(),
          Joi.object({
            url: Joi.string().uri().required(),
            publicId: Joi.string().optional()
          })
        )
      ),
      Joi.array().length(0),
      Joi.valid(null)
    ).optional(),
    // Opening hours
    openingHours: Joi.object().pattern(
      Joi.string(),
      Joi.object({
        open: Joi.string().optional(),
        close: Joi.string().optional(),
        closed: Joi.boolean().optional()
      })
    ).optional().allow(null),
    // Social media and external profiles (optional)
    website: Joi.string().allow('', null).optional(),
    tripAdvisorUrl: Joi.string().allow('', null).optional(),
    tripAdvisorLink: Joi.string().allow('', null).optional(),
    googleBusinessName: Joi.string().allow('', null).optional(),
    facebook: Joi.string().allow('', null).optional(),
    instagram: Joi.string().allow('', null).optional(),
    twitter: Joi.string().allow('', null).optional()
  }),

  // Update profile validation
  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    phone: Joi.string().pattern(/^\+?[0-9]{7,15}$/),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90),
      longitude: Joi.number().min(-180).max(180),
      address: Joi.string()
    })
  })
};

module.exports = { validate, schemas };

