const User = require('../models/User.model');
const Business = require('../models/Business.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const SuspendedAccount = require('../models/SuspendedAccount.model');
const Review = require('../models/Review.model');
const Coupon = require('../models/Coupon.model');
const Order = require('../models/Order.model');
const { sendPushNotification, sendBulkNotifications } = require('../utils/notification');
const { sendEmail } = require('../utils/emailService');
const { generateBusinessQRCode } = require('../utils/qrcode');
const { syncGoogleRatingsForBusiness } = require('./externalReviews.controller');
const { getBusinessLeaderboards } = require('../utils/businessStats');

// ── Analytics cache: avoids re-aggregating within 30s ─────────────────────
const analyticsCache = new Map(); // key → { data, cachedAt }
const ANALYTICS_CACHE_TTL_MS = 30 * 1000; // 30 seconds

// @desc    Get admin dashboard stats
// @route   GET /api/admin/dashboard
// @access  Private (Admin)
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments({ role: 'customer' });
    const totalBusinesses = await Business.countDocuments();
    const activeBusinesses = await Business.countDocuments({ status: 'active' });
    const pendingBusinesses = await Business.countDocuments({ status: 'pending' });
    const totalReviews = await Review.countDocuments();
    const totalCoupons = await Coupon.countDocuments();
    
    // Order stats
    const totalOrders = await Order.countDocuments();
    const activeOrders = await Order.countDocuments({ status: { $in: ['new', 'accepted', 'preparing', 'ready'] } });

    // Get recent users
    const recentUsers = await User.find()
      .select('name email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get recent businesses
    const recentBusinesses = await Business.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get reviews stats
    const reviewStats = await Review.aggregate([
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: -1 } }
    ]);

    // Get monthly growth
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: lastMonth }
    });

    const newBusinessesThisMonth = await Business.countDocuments({
      createdAt: { $gte: lastMonth }
    });

    res.status(200).json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth
        },
        businesses: {
          total: totalBusinesses,
          active: activeBusinesses,
          pending: pendingBusinesses,
          newThisMonth: newBusinessesThisMonth
        },
        reviews: {
          total: totalReviews,
          distribution: reviewStats
        },
        coupons: {
          total: totalCoupons
        },
        orders: {
          total: totalOrders,
          active: activeOrders
        }
      },
      recentUsers,
      recentBusinesses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private (Admin)
exports.getAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { role, status, search } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all businesses
// @route   GET /api/admin/businesses
// @access  Private (Admin)
exports.getAllBusinesses = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, kycStatus, category, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (kycStatus) query.kycStatus = kycStatus;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const businesses = await Business.find(query)
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Business.countDocuments(query);

    res.status(200).json({
      success: true,
      count: businesses.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      businesses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single business by ID
// @route   GET /api/admin/businesses/:id
// @access  Private (Admin)
exports.getBusinessById = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id)
      .populate('owner', 'name email phone')
      .populate('claimRequest.requestedBy', 'name email phone');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    res.status(200).json({
      success: true,
      business
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create business (Admin) - Owner info is OPTIONAL
// @route   POST /api/admin/businesses
// @access  Private (Admin)
exports.createBusiness = async (req, res, next) => {
  try {
    const {
      name, ownerName, firstName, lastName, email, phone, category, description,
      address, buildingNumber, street, city, county, postcode, country, landmark,
      latitude, longitude, radius,
      website,
      tripAdvisorUrl, googleBusinessName,
      openingHours, ownerId, skipOwnerCreation
    } = req.body;

    // Validate required fields - owner info (email, phone) is now OPTIONAL
    if (!name || !category || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, and location (latitude, longitude)'
      });
    }

    // Determine if we should create/link an owner
    const hasOwnerInfo = email || ownerId;
    let owner = null;

    if (ownerId) {
      // Link to existing owner
      owner = await BusinessOwner.findById(ownerId);
      if (!owner) {
        return res.status(404).json({
          success: false,
          message: 'Owner not found'
        });
      }
    } else if (hasOwnerInfo && !skipOwnerCreation) {
      // Create owner account if email provided
      const ownerFullName = ownerName || `${firstName || ''} ${lastName || ''}`.trim() || 'Business Owner';

      // Check if owner already exists
      owner = await BusinessOwner.findOne({ email: email.toLowerCase() });
      if (!owner) {
        // Create new owner with temporary password
        const tempPassword = Math.random().toString(36).slice(-12);
        owner = await BusinessOwner.create({
          name: ownerFullName,
          email: email.toLowerCase(),
          phone: phone || '',
          passwordHash: tempPassword, // Will be hashed by pre-save hook
          emailVerified: true, // Admin created, auto-verify
          phoneVerified: true
        });
        console.log(`✅ Created owner account for: ${email}`);
      }

      // Check if this owner already has a business
      const existingBusiness = await Business.findOne({ owner: owner._id });
      if (existingBusiness) {
        return res.status(400).json({
          success: false,
          message: 'This owner already has a registered business'
        });
      }
    }
    // If no owner info provided and skipOwnerCreation is true, create business without owner

    // Build full address from UK format fields
    let fullAddress = '';
    if (typeof address === 'string' && address.trim()) {
      fullAddress = address.trim();
    } else {
      const addressParts = [];
      if (buildingNumber) addressParts.push(buildingNumber);
      if (street) addressParts.push(street);
      if (city) addressParts.push(city);
      if (county) addressParts.push(county);
      if (postcode) addressParts.push(postcode);
      if (country) addressParts.push(country);
      if (landmark) addressParts.push(`Near: ${landmark}`);
      fullAddress = addressParts.join(', ');
    }

    // Prepare business data
    const businessData = {
      name,
      category,
      description: description || '',
      status: req.body.status || 'pending',
      kycStatus: req.body.kycStatus || 'pending',
      radius: radius || 50,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      }
    };

    // Add owner info only if we have an owner
    if (owner) {
      businessData.owner = owner._id;
      businessData.ownerName = ownerName || owner.name;
      businessData.email = email || owner.email;
      businessData.phone = phone || owner.phone;
    } else {
      // Business without owner - use provided info or defaults
      const ownerFullName = ownerName || `${firstName || ''} ${lastName || ''}`.trim();
      if (ownerFullName) businessData.ownerName = ownerFullName;
      if (email) businessData.email = email;
      if (phone) businessData.phone = phone;
    }

    // Handle address - UK format support
    if (typeof address === 'object' && address !== null) {
      businessData.address = {
        ...address,
        fullAddress: address.fullAddress || fullAddress
      };
    } else {
      businessData.address = {
        buildingNumber: buildingNumber || '',
        street: street || '',
        city: city || '',
        county: county || '',
        postcode: postcode || '',
        country: country || 'United Kingdom',
        landmark: landmark || '',
        fullAddress: fullAddress
      };
    }

    // Handle opening hours
    if (openingHours) {
      businessData.openingHours = openingHours;
    }

    // Handle social media (only website is supported)
    if (website) {
      businessData.socialMedia = {
        website: website || ''
      };
    }

    // Handle external profiles
    if (tripAdvisorUrl || googleBusinessName) {
      businessData.externalProfiles = {
        tripAdvisor: { profileUrl: tripAdvisorUrl || '' },
        googleBusiness: { businessName: googleBusinessName || '' }
      };
    }

    // Handle logo/cover images if provided as URLs
    if (req.body.logo) {
      businessData.logo = typeof req.body.logo === 'string'
        ? { url: req.body.logo, publicId: req.body.logoPublicId || null }
        : req.body.logo;
    }

    if (req.body.coverImage) {
      businessData.coverImage = typeof req.body.coverImage === 'string'
        ? { url: req.body.coverImage, publicId: req.body.coverImagePublicId || null }
        : req.body.coverImage;
    }

    if (req.body.images && Array.isArray(req.body.images)) {
      businessData.images = req.body.images;
    }

    // ----------------------------------------------------
    // DUPLICATE CHECK: Prevent exact same name at exact same location
    // ----------------------------------------------------
    const duplicateBusiness = await Business.findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }, // Case-insensitive exact match
      'location.coordinates': [parseFloat(longitude), parseFloat(latitude)]
    });

    if (duplicateBusiness) {
      return res.status(400).json({
        success: false,
        message: 'A business with this exact name is already registered at this location.'
      });
    }

    const business = await Business.create(businessData);

    console.log(`✅ Admin created business: ${business.name} (${owner ? 'with owner' : 'without owner'})`);

    // Auto-sync Google ratings in background (if Google Business name is provided)
    if (googleBusinessName && googleBusinessName.trim()) {
      console.log(`🔄 Auto-syncing Google ratings for business: ${business._id}`);
      // Call sync in background without blocking the response
      syncGoogleRatingsForBusiness(business._id.toString(), true)
        .then(result => {
          if (result.success) {
            console.log(`✅ Auto-sync completed for business: ${business._id} - Rating: ${result.data.rating}, Count: ${result.data.reviewCount}`);
          } else {
            console.log(`⚠️  Auto-sync failed for business: ${business._id} - ${result.error}`);
          }
        })
        .catch(err => {
          console.error(`❌ Auto-sync error for business: ${business._id}`, err.message);
        });
    }

    res.status(201).json({
      success: true,
      message: `Business created successfully${owner ? '' : ' (no owner account)'}`,
      business
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business (Admin override)
// @route   PUT /api/admin/businesses/:id
// @access  Private (Admin)
exports.updateBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Track status change for notification
    const oldStatus = business.status;

    // Admin can update any field
    const updates = {};
    const allowedFields = [
      'name', 'description', 'email', 'phone', 'category',
      'address', 'latitude', 'longitude', 'radius', 'orderRadius',
      'openingHours', 'socialMedia', 'status', 'kycStatus',
      'logo', 'coverImage', 'images', 'website',
      'tripAdvisorUrl', 'googleBusinessName'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field === 'latitude' || field === 'longitude') {
          // Update location coordinates
          if (!updates.location) {
            updates.location = business.location || { type: 'Point', coordinates: [0, 0] };
          }
          if (field === 'longitude') {
            updates.location.coordinates[0] = parseFloat(req.body[field]);
          } else {
            updates.location.coordinates[1] = parseFloat(req.body[field]);
          }
        } else if (field === 'address' && typeof req.body[field] === 'string') {
          updates.address = { fullAddress: req.body[field] };
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Handle socialMedia separately (only website is supported)
    if (req.body.website !== undefined) {
      updates.socialMedia = {
        website: req.body.website
      };
    }

    // Handle external profiles
    if (req.body.tripAdvisorUrl || req.body.googleBusinessName) {
      updates.externalProfiles = {
        ...(business.externalProfiles || {}),
        tripAdvisor: {
          profileUrl: req.body.tripAdvisorUrl !== undefined ? req.body.tripAdvisorUrl : (business.externalProfiles?.tripAdvisor?.profileUrl || '')
        },
        googleBusiness: {
          ...(business.externalProfiles?.googleBusiness || {}),
          businessName: req.body.googleBusinessName !== undefined ? req.body.googleBusinessName : (business.externalProfiles?.googleBusiness?.businessName || '')
        }
      };
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('owner', 'name email phone');

    // Send notification if status changed
    const newStatus = updatedBusiness.status;
    if (oldStatus !== newStatus && (newStatus === 'active' || newStatus === 'rejected')) {
      try {
        if (newStatus === 'active') {
          await sendPushNotification(
            updatedBusiness.owner._id,
            '🎉 Business Approved!',
            `Congratulations! ${updatedBusiness.name} is now live on HashView`,
            {
              type: 'business_approved',
              screen: 'BusinessDashboard',
              businessId: updatedBusiness._id.toString()
            }
          );
          console.log(`✅ Notification sent for business approval`);
        } else if (newStatus === 'rejected') {
          await sendPushNotification(
            updatedBusiness.owner._id,
            '❌ Business Update Required',
            `Your business ${updatedBusiness.name} needs attention. Please check details.`,
            {
              type: 'business_rejected',
              screen: 'BusinessDashboard',
              businessId: updatedBusiness._id.toString()
            }
          );
          console.log(`✅ Notification sent for business rejection`);
        }
      } catch (error) {
        console.error('❌ Failed to send business status notification:', error);
        // Don't fail the request if notification fails
      }
    }

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      business: updatedBusiness
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business radius
// @route   PUT /api/admin/businesses/:id/radius
// @access  Private (Admin)
exports.updateBusinessRadius = async (req, res, next) => {
  try {
    const { radius } = req.body;

    if (!radius || isNaN(radius) || radius < 10 || radius > 500) {
      return res.status(400).json({
        success: false,
        message: 'Radius must be a number between 10 and 500 meters'
      });
    }

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    business.radius = parseInt(radius);
    await business.save();

    res.status(200).json({
      success: true,
      message: `Business review radius updated to ${radius}m`,
      business: {
        _id: business._id,
        name: business.name,
        radius: business.radius
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve/Reject business KYC
// @route   PUT /api/admin/businesses/:id/kyc
// @access  Private (Admin)
exports.updateBusinessKYC = async (req, res, next) => {
  try {
    const { action, reason } = req.body; // action: 'approve' or 'reject'

    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Get business owner
    const owner = await BusinessOwner.findById(business.owner);

    if (action === 'approve') {
      business.kycStatus = 'approved';
      business.status = 'active';
      business.verifiedAt = new Date();
      business.verifiedBy = req.user.id;

      // Generate QR code automatically when business is approved
      if (!business.qrCode) {
        try {
          console.log('📱 Generating QR code for approved business:', business._id);
          const { generateBusinessQR } = require('../services/qrService');
          const qrCodeUrl = await generateBusinessQR(business._id.toString());
          console.log('✅ QR code generated successfully:', qrCodeUrl);
        } catch (qrError) {
          console.error('❌ Error generating QR code:', qrError);
          // Don't fail the approval if QR generation fails
        }
      }

      // Send push notification to business owner
      await sendPushNotification(
        business.owner,
        'Business Approved! 🎉',
        `Your business "${business.name}" has been approved and is now active.`,
        { type: 'business_verification', businessId: business._id.toString() }
      );

      // Send email notification
      if (owner) {
        await sendEmail({
          to: owner.email,
          subject: 'Business Approved - You Are Now Live! 🎉',
          html: `
            <h2>Congratulations ${owner.name}!</h2>
            <p>Great news! Your business <strong>${business.name}</strong> has been approved by our admin team!</p>
            
            <p><strong>✅ What This Means:</strong></p>
            <ul>
              <li>Your business is now <strong>LIVE</strong> and visible to all HashView users</li>
              <li>Customers can now find you, read reviews, and redeem coupons</li>
              <li>You can start managing your business dashboard</li>
            </ul>
            
            <p><strong>Next Steps:</strong></p>
            <ol>
              <li>Log in to your business dashboard</li>
              <li>Update your business hours and details</li>
              <li>Create special offers and coupons for customers</li>
              <li>Start building your reputation with verified reviews</li>
            </ol>
            
            <p>Thank you for choosing HashView!</p>
            <p>Best regards,<br>HashView Team</p>
          `
        });
      }
    } else if (action === 'reject') {
      business.kycStatus = 'rejected';
      business.status = 'rejected';
      business.rejectionReason = reason || 'KYC verification failed';

      // Send push notification to business owner
      await sendPushNotification(
        business.owner,
        'Business Verification Failed',
        `Your business "${business.name}" verification was rejected. Reason: ${business.rejectionReason}`,
        { type: 'business_verification', businessId: business._id.toString() }
      );

      // Send email notification
      if (owner) {
        await sendEmail({
          to: owner.email,
          subject: 'Business Verification Status - Action Required',
          html: `
            <h2>Hi ${owner.name},</h2>
            <p>We regret to inform you that your business <strong>${business.name}</strong> could not be approved at this time.</p>
            
            <p><strong>Reason:</strong></p>
            <p style="background-color: #FEF2F2; border-left: 4px solid #EF4444; padding: 12px; color: #991B1B;">
              ${business.rejectionReason}
            </p>
            
            <p><strong>What You Can Do:</strong></p>
            <ol>
              <li>Review the rejection reason above</li>
              <li>Update your business information or documents</li>
              <li>Resubmit your verification request</li>
              <li>Contact our support team if you need assistance: support@hashview.com</li>
            </ol>
            
            <p>We're here to help you get verified!</p>
            <p>Best regards,<br>HashView Team</p>
          `
        });
      }
    }

    await business.save();

    res.status(200).json({
      success: true,
      message: `Business ${action}ed successfully`,
      business
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id/status
// @access  Private (Admin)
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // If setting status to 'suspended', create SuspendedAccount record
    if (status === 'suspended') {
      const existingSuspension = await SuspendedAccount.findOne({
        email: user.email.toLowerCase(),
        status: 'suspended'
      });

      if (!existingSuspension) {
        // Create or update suspended account record
        const unsuspendedRecord = await SuspendedAccount.findOne({
          email: user.email.toLowerCase(),
          status: 'unsuspended'
        });

        if (unsuspendedRecord) {
          unsuspendedRecord.status = 'suspended';
          unsuspendedRecord.suspendedBy = req.user.id;
          unsuspendedRecord.suspendedAt = new Date();
          unsuspendedRecord.reason = reason || 'Account suspended by admin';
          unsuspendedRecord.unsuspendedAt = null;
          unsuspendedRecord.unsuspendedBy = null;
          await unsuspendedRecord.save();
        } else {
          try {
            await SuspendedAccount.create({
              email: user.email.toLowerCase(),
              accountType: 'user',
              originalAccountId: user._id,
              suspendedBy: req.user.id,
              reason: reason || 'Account suspended by admin',
              status: 'suspended'
            });
          } catch (createError) {
            if (createError.code !== 11000) {
              throw createError;
            }
            // If unique constraint, update existing
            const existing = await SuspendedAccount.findOne({ email: user.email.toLowerCase() });
            if (existing) {
              existing.status = 'suspended';
              existing.suspendedBy = req.user.id;
              existing.suspendedAt = new Date();
              existing.reason = reason || 'Account suspended by admin';
              await existing.save();
            }
          }
        }
      }
    } else if (status === 'active') {
      // If reactivating, mark suspended account as unsuspended if exists
      const suspendedRecord = await SuspendedAccount.findOne({
        email: user.email.toLowerCase(),
        status: 'suspended'
      });

      if (suspendedRecord) {
        suspendedRecord.status = 'unsuspended';
        suspendedRecord.unsuspendedAt = new Date();
        suspendedRecord.unsuspendedBy = req.user.id;
        await suspendedRecord.save();
      }
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User status updated successfully',
      user: user.getPublicProfile()
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reviews
// @route   GET /api/admin/reviews
// @access  Private (Admin)
exports.getAllReviews = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, businessId } = req.query;

    const query = {};
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    
    if (businessId) {
      query.business = businessId;
    }

    const reviews = await Review.find(query)
      .populate('user', 'name email profileImage')
      .populate('business', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(); // Use lean to easily add properties

    // Attach how many times this user has reviewed this specific business
    for (let i = 0; i < reviews.length; i++) {
      const review = reviews[i];
      if (review.user && review.business) {
        review.userReviewCountForBusiness = await Review.countDocuments({
          user: review.user._id,
          business: review.business._id
        });
      } else {
        review.userReviewCountForBusiness = 0;
      }
    }

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      count: reviews.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      reviews
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update review status
// @route   PUT /api/admin/reviews/:id/status
// @access  Private (Admin)
exports.updateReviewStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    review.status = status;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review status updated successfully',
      review
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Review Analytics leaderboard (per-business reviewer rankings)
// @route   GET /api/admin/reviews/analytics
// @access  Private (Admin — VIEW_REVIEWS permission)
exports.getReviewAnalytics = async (req, res, next) => {
  try {
    const {
      businessId,
      dateFrom,
      dateTo,
      minReviews = 1,
      sortBy = 'reviewCount',
      page = 1,
      limit = 20,
      leaderboardLimit = 10,
      forceRefresh
    } = req.query;

    // Build a cache key from the filter set
    const cacheKey = JSON.stringify({
      businessId, dateFrom, dateTo, minReviews, sortBy, page, limit, leaderboardLimit
    });

    // Serve from cache if fresh (unless forceRefresh is requested)
    const cached = analyticsCache.get(cacheKey);
    if (!forceRefresh && cached && (Date.now() - cached.cachedAt) < ANALYTICS_CACHE_TTL_MS) {
      return res.status(200).json({
        success: true,
        cached: true,
        cachedAt: cached.cachedAt,
        ...cached.data
      });
    }

    // Run the analytics aggregation
    const result = await getBusinessLeaderboards({
      businessId,
      dateFrom,
      dateTo,
      minReviews: parseInt(minReviews) || 1,
      sortBy,
      page: parseInt(page) || 1,
      limit: Math.min(parseInt(limit) || 20, 50), // max 50 cards per page
      leaderboardLimit: Math.min(parseInt(leaderboardLimit) || 10, 20)
    });

    // Store in cache
    analyticsCache.set(cacheKey, { data: result, cachedAt: Date.now() });

    // Evict old cache entries (keep map small)
    if (analyticsCache.size > 100) {
      const firstKey = analyticsCache.keys().next().value;
      analyticsCache.delete(firstKey);
    }

    res.status(200).json({
      success: true,
      cached: false,
      cachedAt: Date.now(),
      ...result
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Send push notification (ENHANCED - Full Admin Control with OneSignal)
// @route   POST /api/admin/notifications/send
// @access  Private (Admin)
exports.sendNotification = async (req, res, next) => {
  try {
    const {
      title,
      message,
      recipientType,    // 'user', 'business', 'all_users', 'all_businesses', 'specific_user', 'specific_business'
      recipientIds,     // Array of user/business IDs (for specific recipients)
      data              // Optional data payload for the notification
    } = req.body;

    console.log('📢 Admin notification request:', { title, message, recipientType, recipientIds });

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        message: 'Title and message are required'
      });
    }

    // Load BusinessOwner model once (used in multiple cases)
    const BusinessOwner = require('../models/BusinessOwner.model');
    let recipientList = [];
    let sentCount = 0;
    let failedCount = 0;

    switch (recipientType) {
      case 'all_users':
        console.log('   📊 Sending to all active users');

        // Get ALL active users
        const allUsers = await User.find({
          role: 'customer',
          status: 'active'
        }).select('_id');

        recipientList = allUsers.map(u => u._id);

        // Send in batches
        const allUsersResult = await sendBulkNotifications(
          recipientList,
          title,
          message,
          { type: 'admin_broadcast', ...data }
        );

        sentCount = allUsersResult.sent;
        failedCount = allUsersResult.failed;
        console.log(`   ✅ Notification broadcast sent to ${sentCount} users; failed/skipped=${failedCount}`);
        break;

      case 'all_businesses':
        console.log('   📊 Sending to all active business owners');

        // Get ALL active business owners
        const allBusinessOwners = await BusinessOwner.find({
          status: 'active'
        }).select('_id');

        recipientList = allBusinessOwners.map(b => b._id);

        // Send in batches
        const allBusinessResult = await sendBulkNotifications(
          recipientList,
          title,
          message,
          { type: 'admin_broadcast', ...data }
        );

        sentCount = allBusinessResult.sent;
        failedCount = allBusinessResult.failed;
        console.log(`   ✅ Notification broadcast sent to ${sentCount} owners; failed/skipped=${failedCount}`);
        break;

      case 'specific_user':
        // Send to specific user(s)
        if (!recipientIds || recipientIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please provide at least one user ID'
          });
        }

        recipientList = recipientIds;

        console.log(`   📊 Sending to ${recipientList.length} specific user(s)`);

        const specificUserResult = await sendBulkNotifications(
          recipientList,
          title,
          message,
          { type: 'admin_broadcast', ...data }
        );

        sentCount = specificUserResult.sent;
        failedCount = specificUserResult.failed;
        break;

      case 'specific_business':
        // Send to specific business owner(s)
        if (!recipientIds || recipientIds.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Please provide at least one business ID'
          });
        }

        console.log(`   📊 Sending to ${recipientIds.length} specific business(es)`);

        // Get business owners for the selected businesses
        const ownerIds = [];
        for (const businessId of recipientIds) {
          const business = await Business.findById(businessId).select('owner');
          if (business && business.owner) {
            ownerIds.push(business.owner.toString());
          }
        }

        recipientList = ownerIds;

        if (recipientList.length > 0) {
          const specificBusinessResult = await sendBulkNotifications(
            recipientList,
            title,
            message,
            { type: 'admin_broadcast', ...data }
          );
          sentCount = specificBusinessResult.sent;
          failedCount = specificBusinessResult.failed;
        }

        console.log(`   ✅ Notification sent to ${sentCount} business owner(s)`);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid recipient type. Use: all_users, all_businesses, specific_user, or specific_business'
        });
    }

    res.status(200).json({
      success: true,
      message: `Notification sent successfully to ${sentCount} recipient(s)`,
      sentCount,
      failedCount,
      recipientType,
      notification: {
        title,
        message,
        sentAt: new Date()
      }
    });
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/admin/users/:id
// @access  Private (Admin)
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete business
// @route   DELETE /api/admin/businesses/:id
// @access  Private (Admin)
exports.deleteBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    await business.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Business deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend user account
// @route   POST /api/admin/users/:id/suspend
// @access  Private (Admin)
exports.suspendUser = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`🔄 Attempting to suspend user: ${user.email} (${user._id})`);

    // Check if already suspended
    const existingSuspension = await SuspendedAccount.findOne({
      email: user.email.toLowerCase(),
      status: 'suspended'
    });

    if (existingSuspension) {
      console.log(`⚠️  User ${user.email} is already suspended`);
      return res.status(400).json({
        success: false,
        message: 'This account is already suspended'
      });
    }

    // If there's an unsuspended record, update it instead of creating new
    const unsuspendedRecord = await SuspendedAccount.findOne({
      email: user.email.toLowerCase(),
      status: 'unsuspended'
    });

    let suspendedAccount;

    if (unsuspendedRecord) {
      // Update existing record
      unsuspendedRecord.status = 'suspended';
      unsuspendedRecord.suspendedBy = req.user.id;
      unsuspendedRecord.suspendedAt = new Date();
      unsuspendedRecord.reason = reason.trim();
      unsuspendedRecord.unsuspendedAt = null;
      unsuspendedRecord.unsuspendedBy = null;
      await unsuspendedRecord.save();
      suspendedAccount = unsuspendedRecord;
      console.log(`✅ Updated existing suspended record for ${user.email}`);
    } else {
      // Create new suspended account record
      try {
        suspendedAccount = await SuspendedAccount.create({
          email: user.email.toLowerCase(),
          accountType: user.role === 'admin' ? 'user' : 'user',
          originalAccountId: user._id,
          suspendedBy: req.user.id,
          reason: reason.trim(),
          status: 'suspended'
        });
        console.log(`✅ Created new suspended account record for ${user.email}: ${suspendedAccount._id}`);
      } catch (createError) {
        console.error(`❌ Error creating SuspendedAccount:`, createError);
        // If unique constraint error, try to find and update existing record
        if (createError.code === 11000) {
          const existing = await SuspendedAccount.findOne({ email: user.email.toLowerCase() });
          if (existing) {
            existing.status = 'suspended';
            existing.suspendedBy = req.user.id;
            existing.suspendedAt = new Date();
            existing.reason = reason.trim();
            await existing.save();
            suspendedAccount = existing;
            console.log(`✅ Updated existing record after unique constraint error for ${user.email}`);
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }
    }

    // Update user status
    user.status = 'suspended';
    await user.save();
    console.log(`✅ Updated user status to suspended for ${user.email}`);

    // Send notification
    await sendPushNotification(
      user._id,
      'Account Suspended',
      `Your account has been suspended. Reason: ${reason}`,
      { type: 'account_suspension' }
    );

    res.status(200).json({
      success: true,
      message: 'User account suspended successfully',
      suspendedAccount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Suspend business account
// @route   POST /api/admin/businesses/:id/suspend
// @access  Private (Admin)
exports.suspendBusiness = async (req, res, next) => {
  try {
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Suspension reason is required'
      });
    }

    const business = await Business.findById(req.params.id).populate('owner');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    const owner = await BusinessOwner.findById(business.owner._id);

    if (!owner) {
      return res.status(404).json({
        success: false,
        message: 'Business owner not found'
      });
    }

    // Check if already suspended
    const existingSuspension = await SuspendedAccount.findOne({
      email: owner.email.toLowerCase(),
      status: 'suspended'
    });

    if (existingSuspension) {
      return res.status(400).json({
        success: false,
        message: 'This account is already suspended'
      });
    }

    // Create suspended account record
    const suspendedAccount = await SuspendedAccount.create({
      email: owner.email.toLowerCase(),
      accountType: 'businessOwner',
      originalAccountId: owner._id,
      suspendedBy: req.user.id,
      reason: reason.trim(),
      status: 'suspended'
    });

    // Update business owner status
    owner.status = 'suspended';
    await owner.save();

    // Update business status
    business.status = 'suspended';
    await business.save();

    // Send notification
    await sendPushNotification(
      owner._id,
      'Business Account Suspended',
      `Your business account has been suspended. Reason: ${reason}`,
      { type: 'business_suspension', businessId: business._id.toString() }
    );

    res.status(200).json({
      success: true,
      message: 'Business account suspended successfully',
      suspendedAccount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unsuspend account
// @route   POST /api/admin/suspended/:id/unsuspend
// @access  Private (Admin)
exports.unsuspendAccount = async (req, res, next) => {
  try {
    const suspendedAccount = await SuspendedAccount.findById(req.params.id);

    if (!suspendedAccount) {
      return res.status(404).json({
        success: false,
        message: 'Suspended account record not found'
      });
    }

    if (suspendedAccount.status === 'unsuspended') {
      return res.status(400).json({
        success: false,
        message: 'This account is already unsuspended'
      });
    }

    // Update suspended account record
    suspendedAccount.status = 'unsuspended';
    suspendedAccount.unsuspendedAt = new Date();
    suspendedAccount.unsuspendedBy = req.user.id;
    await suspendedAccount.save();

    // Restore original account based on account type
    if (suspendedAccount.accountType === 'user' || suspendedAccount.accountType === 'businessOwner') {
      const UserModel = suspendedAccount.accountType === 'user' ? User : BusinessOwner;

      const account = await UserModel.findById(suspendedAccount.originalAccountId);

      if (account) {
        account.status = 'active';
        await account.save();

        // If it's a business owner, also restore the business
        if (suspendedAccount.accountType === 'businessOwner') {
          const business = await Business.findOne({ owner: account._id });
          if (business) {
            business.status = 'active';
            await business.save();
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Account unsuspended successfully',
      suspendedAccount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate QR code for business (Admin)
// @route   POST /api/admin/businesses/:id/generate-qr
// @access  Private (Admin)
exports.generateBusinessQRCode = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Generate QR code
    const qrCode = await generateBusinessQRCode(business._id.toString(), business.name);
    business.qrCode = qrCode;
    await business.save();

    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      qrCode
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all suspended accounts
// @route   GET /api/admin/suspended
// @access  Private (Admin)
exports.getAllSuspendedAccounts = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const { status, accountType } = req.query;

    const query = {};
    if (status) query.status = status;
    if (accountType) query.accountType = accountType;

    const suspendedAccounts = await SuspendedAccount.find(query)
      .populate('suspendedBy', 'name email')
      .populate('unsuspendedBy', 'name email')
      .sort({ suspendedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SuspendedAccount.countDocuments(query);

    res.status(200).json({
      success: true,
      count: suspendedAccounts.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      suspendedAccounts
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all coupons (admin)
// @route   GET /api/admin/coupons
// @access  Private (Admin)
exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
      .populate('business', 'name logo')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle coupon status (admin)
// @route   PUT /api/admin/coupons/:id/status
// @access  Private (Admin)
exports.toggleCouponStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    coupon.isActive = isActive;
    await coupon.save();

    res.status(200).json({
      success: true,
      message: `Coupon ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: coupon
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete coupon (admin)
// @route   DELETE /api/admin/coupons/:id
// @access  Private (Admin)
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found'
      });
    }

    await coupon.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all business owners (with notification settings)
// @route   GET /api/admin/business-owners
// @access  Private (Admin)
exports.getBusinessOwners = async (req, res, next) => {
  try {
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;
    const { search } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const owners = await BusinessOwner.find(query)
      .select('name email subscription.status pushNotifications freeTrial createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await BusinessOwner.countDocuments(query);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      owners: owners.map(o => ({
        _id:   o._id,
        name:  o.name,
        email: o.email,
        subscriptionStatus: o.subscription?.status || 'inactive',
        pushNotifications: {
          maxReach:   o.pushNotifications?.maxReach ?? 100,
          totalSent:  o.pushNotifications?.totalSent ?? 0,
          totalUsersReached: o.pushNotifications?.notifiedUserIds?.length ?? 0
        },
        freeTrial: {
          updatesUsed: o.freeTrial?.updatesUsed || 0,
          maxFreeUpdates: o.freeTrial?.maxFreeUpdates || 25,
          remaining: Math.max(0, (o.freeTrial?.maxFreeUpdates || 25) - (o.freeTrial?.updatesUsed || 0))
        }
      }))
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set notification reach limit for a business owner
// @route   PUT /api/admin/business-owners/:ownerId/notification-limit
// @access  Private (Admin)
exports.setOwnerNotificationLimit = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { maxReach } = req.body;

    if (maxReach === undefined || isNaN(maxReach) || maxReach < 1 || maxReach > 100000) {
      return res.status(400).json({
        success: false,
        message: 'maxReach must be a number between 1 and 100,000'
      });
    }

    const owner = await BusinessOwner.findByIdAndUpdate(
      ownerId,
      { $set: { 'pushNotifications.maxReach': parseInt(maxReach) } },
      { new: true }
    ).select('name email pushNotifications');

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Business owner not found' });
    }

    res.status(200).json({
      success: true,
      message: `Notification limit updated to ${maxReach} users per post`,
      owner: {
        _id:  owner._id,
        name: owner.name,
        email: owner.email,
        pushNotifications: {
          maxReach:  owner.pushNotifications.maxReach,
          totalSent: owner.pushNotifications.totalSent,
          totalUsersReached: owner.pushNotifications.notifiedUserIds?.length ?? 0
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Set free trial limit for a business owner (Admin control)
// @route   PUT /api/admin/business-owners/:ownerId/free-trial-limit
// @access  Private (Admin)
exports.setOwnerFreeTrialLimit = async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { maxFreeUpdates } = req.body;

    if (maxFreeUpdates === undefined || isNaN(maxFreeUpdates) || maxFreeUpdates < 0 || maxFreeUpdates > 10000) {
      return res.status(400).json({
        success: false,
        message: 'maxFreeUpdates must be a number between 0 and 10,000'
      });
    }

    const owner = await BusinessOwner.findByIdAndUpdate(
      ownerId,
      { $set: { 'freeTrial.maxFreeUpdates': parseInt(maxFreeUpdates) } },
      { new: true }
    ).select('name email freeTrial');

    if (!owner) {
      return res.status(404).json({ success: false, message: 'Business owner not found' });
    }

    const remaining = Math.max(0, (owner.freeTrial?.maxFreeUpdates || 25) - (owner.freeTrial?.updatesUsed || 0));

    res.status(200).json({
      success: true,
      message: `Free trial limit updated to ${maxFreeUpdates} updates`,
      owner: {
        _id:  owner._id,
        name: owner.name,
        email: owner.email,
        freeTrial: {
          updatesUsed: owner.freeTrial?.updatesUsed || 0,
          maxFreeUpdates: owner.freeTrial?.maxFreeUpdates || 25,
          remaining
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Promote a standard User to a BusinessOwner
// @route   POST /api/admin/users/:id/promote-to-business
// @access  Private (Admin)
exports.promoteUserToBusiness = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('+passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if BusinessOwner already exists with this email
    let businessOwner = await BusinessOwner.findOne({ email: user.email.toLowerCase() });

    if (businessOwner) {
      // If they already have a business account, just ensure it's active
      if (businessOwner.status !== 'active') {
        businessOwner.status = 'active';
        await businessOwner.save();
      }
      return res.status(200).json({
        success: true,
        message: 'User already has a business account. Account ensured active.',
        businessOwner: {
          _id: businessOwner._id,
          name: businessOwner.name,
          email: businessOwner.email
        }
      });
    }

    // Create new BusinessOwner using User's credentials
    businessOwner = await BusinessOwner.create({
      name: user.name,
      email: user.email.toLowerCase(),
      phone: user.phone,
      passwordHash: user.passwordHash, // Copy hash directly (it's already hashed)
      address: user.address,
      profileImage: user.profileImage,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      status: 'active',
      role: 'business'
    });

    // Also update the original user's role to 'business' for consistency in User collection
    user.role = 'business';
    await user.save();

    res.status(201).json({
      success: true,
      message: 'User successfully promoted to Business Account',
      businessOwner: {
        _id: businessOwner._id,
        name: businessOwner.name,
        email: businessOwner.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get database backup status
// @route   GET /api/admin/backup-status
// @access  Private (Admin)
exports.getBackupStatus = async (req, res, next) => {
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Natively ignored by nodemon because it's a hidden folder
    const backupsDir = path.join(__dirname, '../.backups');
    let lastBackupDate = null;
    
    if (fs.existsSync(backupsDir)) {
      const files = fs.readdirSync(backupsDir);
      // Find directories matching backup-YYYY-MM-DD-HHMMSS
      const backupDirs = files.filter(f => f.startsWith('backup-') && fs.statSync(path.join(backupsDir, f)).isDirectory());
      
      if (backupDirs.length > 0) {
        // Sort alphabetically, the newest timestamp will be last
        backupDirs.sort();
        
        // Find the latest valid backup (must contain backup_info.json to ensure it didn't fail midway)
        let latestValidBackupDir = null;
        for (let i = backupDirs.length - 1; i >= 0; i--) {
          const infoPath = path.join(backupsDir, backupDirs[i], 'backup_info.json');
          if (fs.existsSync(infoPath)) {
            latestValidBackupDir = backupDirs[i];
            break;
          }
        }
        
        if (latestValidBackupDir) {
          // Extract timestamp from folder name: backup-2026-05-22-201826
          const timePart = latestValidBackupDir.replace('backup-', '');
          if (timePart.length === 17) { // 10 (date) + 1 (-) + 6 (time)
            const year = timePart.substring(0, 4);
            const month = timePart.substring(5, 7);
            const day = timePart.substring(8, 10);
            const hour = timePart.substring(11, 13);
            const min = timePart.substring(13, 15);
            const sec = timePart.substring(15, 17);
            
            lastBackupDate = new Date(`${year}-${month}-${day}T${hour}:${min}:${sec}Z`);
          } else {
            // Fallback to directory stats
            const stats = fs.statSync(path.join(backupsDir, latestValidBackupDir));
            lastBackupDate = stats.birthtime;
          }
        }
      }
    }

    let needsBackup = true;
    let daysSinceLastBackup = null;

    if (lastBackupDate) {
      const now = new Date();
      const diffTime = Math.abs(now - lastBackupDate);
      daysSinceLastBackup = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysSinceLastBackup <= 15) {
        needsBackup = false;
      }
    }

    res.status(200).json({
      success: true,
      needsBackup,
      daysSinceLastBackup,
      lastBackupDate
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger a manual database backup
// @route   POST /api/admin/backup
// @access  Private (Admin)
exports.triggerBackup = async (req, res, next) => {
  try {
    const { exec } = require('child_process');
    const path = require('path');
    
    const scriptPath = path.join(__dirname, '../scripts/backup_db.js');
    
    exec(`node "${scriptPath}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Backup exec error: ${error}`);
        return res.status(500).json({
          success: false,
          message: 'Failed to execute backup script',
          error: error.message
        });
      }
      
      console.log(`Backup stdout: ${stdout}`);
      
      res.status(200).json({
        success: true,
        message: 'Database backup completed successfully',
        output: stdout
      });
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all orders (Admin system-wide monitoring)
// @route   GET /api/admin/orders
// @access  Private (Admin)
exports.getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.query.businessId) query.business = req.query.businessId;
    if (req.query.status) query.status = req.query.status;

    const orders = await Order.find(query)
      .populate('business', 'businessName')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get suspicious orders (Fraud Detection)
// @route   GET /api/admin/orders/suspicious
// @access  Private (Admin)
exports.getSuspiciousOrders = async (req, res, next) => {
  try {
    // Basic fraud detection rule: 5+ orders from the same table at the same business in the last 24 hours
    const suspiciousOrders = await Order.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } },
      { $group: {
          _id: { business: '$business', tableNumber: '$tableNumber' },
          count: { $sum: 1 },
          orders: { $push: '$$ROOT' }
      }},
      { $match: { count: { $gte: 5 } } },
      { $sort: { count: -1 } }
    ]);

    res.status(200).json({
      success: true,
      data: suspiciousOrders
    });
  } catch (error) {
    next(error);
  }
};
