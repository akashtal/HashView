const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Business = require('../models/Business');
const Review = require('../models/Review');
const { auth, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/businesses
// @desc    Get businesses with search and filters
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  query('search').optional().trim(),
  query('category').optional().trim(),
  query('lat').optional().isFloat().withMessage('Latitude must be a valid number'),
  query('lng').optional().isFloat().withMessage('Longitude must be a valid number'),
  query('radius').optional().isFloat({ min: 0 }).withMessage('Radius must be a positive number'),
  query('minRating').optional().isFloat({ min: 0, max: 5 }).withMessage('Min rating must be between 0 and 5'),
  query('status').optional().isIn(['pending', 'approved', 'rejected', 'suspended']).withMessage('Invalid status')
], optionalAuth, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      page = 1,
      limit = 20,
      search,
      category,
      lat,
      lng,
      radius = 10, // km
      minRating,
      status = 'approved'
    } = req.query;

    const skip = (page - 1) * limit;
    const query = { status, isActive: true };

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Category filter
    if (category) {
      query.categories = { $in: [category] };
    }

    // Rating filter
    if (minRating) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Location-based search
    let locationQuery = {};
    if (lat && lng) {
      locationQuery = {
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: radius * 1000 // Convert km to meters
          }
        }
      };
    }

    const businesses = await Business.find({ ...query, ...locationQuery })
      .populate('ownerId', 'name avatar')
      .sort(search ? { score: { $meta: 'textScore' } } : { 'rating.average': -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Business.countDocuments({ ...query, ...locationQuery });

    res.json({
      success: true,
      data: {
        businesses,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get businesses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching businesses'
    });
  }
});

// @route   GET /api/businesses/:id
// @desc    Get business by ID
// @access  Public
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('ownerId', 'name avatar phone email')
      .populate({
        path: 'reviews',
        populate: {
          path: 'userId',
          select: 'name avatar'
        },
        options: { sort: { createdAt: -1 }, limit: 10 }
      });

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get recent reviews
    const reviews = await Review.find({ businessId: business._id, isActive: true })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        business,
        reviews
      }
    });

  } catch (error) {
    console.error('Get business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching business'
    });
  }
});

// @route   POST /api/businesses
// @desc    Create business
// @access  Private (Business/Admin)
router.post('/', [
  auth,
  authorize('business', 'admin'),
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be between 2 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  body('address').isObject().withMessage('Address is required'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.zipCode').notEmpty().withMessage('ZIP code is required'),
  body('address.country').notEmpty().withMessage('Country is required'),
  body('lat').isFloat().withMessage('Latitude is required'),
  body('lng').isFloat().withMessage('Longitude is required'),
  body('categories').isArray({ min: 1 }).withMessage('At least one category is required'),
  body('contact.phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Please provide a valid phone number'),
  body('contact.email').optional().isEmail().withMessage('Please provide a valid email'),
  body('contact.website').optional().isURL().withMessage('Please provide a valid website URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      name,
      description,
      address,
      lat,
      lng,
      categories,
      contact,
      hours,
      features
    } = req.body;

    const business = new Business({
      ownerId: req.user._id,
      name,
      description,
      address: {
        ...address,
        full: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}, ${address.country}`
      },
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      categories,
      contact,
      hours,
      features
    });

    await business.save();

    res.status(201).json({
      success: true,
      message: 'Business created successfully',
      data: {
        business
      }
    });

  } catch (error) {
    console.error('Create business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating business'
    });
  }
});

// @route   PATCH /api/businesses/:id
// @desc    Update business
// @access  Private (Owner/Admin)
router.patch('/:id', [
  auth,
  body('name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Business name must be between 2 and 100 characters'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description cannot be more than 500 characters'),
  body('categories').optional().isArray().withMessage('Categories must be an array'),
  body('contact.phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Please provide a valid phone number'),
  body('contact.email').optional().isEmail().withMessage('Please provide a valid email'),
  body('contact.website').optional().isURL().withMessage('Please provide a valid website URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Check ownership or admin
    if (business.ownerId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own business.'
      });
    }

    const updateData = req.body;
    if (updateData.address) {
      updateData.address.full = `${updateData.address.street}, ${updateData.address.city}, ${updateData.address.state} ${updateData.address.zipCode}, ${updateData.address.country}`;
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('ownerId', 'name avatar');

    res.json({
      success: true,
      message: 'Business updated successfully',
      data: {
        business: updatedBusiness
      }
    });

  } catch (error) {
    console.error('Update business error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating business'
    });
  }
});

// @route   GET /api/businesses/categories
// @desc    Get business categories
// @access  Public
router.get('/categories', async (req, res) => {
  try {
    const categories = await Business.distinct('categories', { status: 'approved', isActive: true });
    
    res.json({
      success: true,
      data: {
        categories: categories.sort()
      }
    });

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching categories'
    });
  }
});

module.exports = router;
