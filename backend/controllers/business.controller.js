const Business = require('../models/Business.model');
const Review = require('../models/Review.model');
const Order = require('../models/Order.model');
const Notification = require('../models/Notification.model');
const { generateBusinessQRCode } = require('../utils/qrcode');
const { getNearbyQuery, calculateDistance } = require('../utils/geolocation');
const { syncGoogleRatingsForBusiness } = require('../controllers/externalReviews.controller');
const { cloudinary } = require('../config/cloudinary');
const ExcelParser = require('../utils/excelParser');
const { geocodeAddress } = require('../utils/geocoding');

// @desc    Create/Register new business
// @route   POST /api/business/register
// @access  Private (Business role)
exports.registerBusiness = async (req, res, next) => {
  try {
    console.log('\n📝 Business Registration Attempt');
    console.log('User ID:', req.user?.id);
    console.log('Request Body:', JSON.stringify(req.body, null, 2));

    const {
      name, ownerName, email, phone, category, description,
      address, buildingNumber, street, area, city, county, state, postcode, pincode, country, landmark,  // UK & International address fields
      latitude, longitude, radius,
      website, tripAdvisorLink, googleBusinessName, openingHours
    } = req.body;


    // Validate required fields for business registration
    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required for business registration',
        field: 'phone'
      });
    }

    // Sanitize phone number: remove spaces, dashes, parentheses for consistent storage
    const sanitizedPhone = phone.replace(/[\s\-\(\)]/g, '');



    // Validate address - require key address fields for business registration
    // Street and city are always required
    // For UK: require postcode
    // For other countries: accept pincode or postcode

    const isUK = !country || country === 'United Kingdom' || country === 'UK' || country === 'GB';

    if (!street || !street.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Street address is required for business registration',
        field: 'street'
      });
    }

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City/Town is required for business registration',
        field: 'city'
      });
    }

    // UK addresses require postcode, international addresses can use postcode or pincode
    if (isUK) {
      if (!postcode || !postcode.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Postcode is required for UK businesses',
          field: 'postcode'
        });
      }
    } else {
      // International addresses
      if ((!postcode || !postcode.trim()) && (!pincode || !pincode.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Postcode or PIN code is required for business registration',
          field: 'postcode'
        });
      }
    }


    // Check if business already exists for this user
    const existingBusiness = await Business.findOne({ owner: req.user.id });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        message: 'You already have a registered business'
      });
    }

    // Prepare business data
    const businessData = {
      name,
      ownerName,
      email,
      phone: sanitizedPhone,
      category,
      description,
      owner: req.user.id,
      status: 'pending',
      kycStatus: 'pending',
      radius: radius || 50
    };

    // Handle address - support UK & International formats
    if (buildingNumber || street || area || city || county || state || postcode || pincode || landmark) {
      // Manual address fields provided from form (UK or International)
      const addressParts = [];
      if (buildingNumber) addressParts.push(buildingNumber);
      if (street) addressParts.push(street);
      if (area) addressParts.push(area);
      if (city) addressParts.push(city);
      if (county) addressParts.push(county);
      if (state) addressParts.push(state);
      if (postcode) addressParts.push(postcode);
      if (pincode) addressParts.push(pincode);
      if (landmark) addressParts.push(`Near: ${landmark}`);

      businessData.address = {
        buildingNumber: buildingNumber || '',
        street: street || '',
        area: area || '',
        city: city || '',
        county: county || '',
        state: state || '',
        postcode: postcode || '',
        zipCode: postcode || pincode || '',  // Use postcode or pincode as zipCode
        pincode: pincode || '',
        landmark: landmark || '',
        country: country || 'United Kingdom',
        fullAddress: address || addressParts.join(', ')  // Use address if provided, otherwise combine parts
      };
    } else if (address && typeof address === 'object') {
      // Structured address object
      businessData.address = {
        ...address,
        buildingNumber: address.buildingNumber || '',
        county: address.county || '',
        postcode: address.postcode || address.zipCode || '',
        pincode: address.pincode || '',
        zipCode: address.zipCode || address.postcode || address.pincode || '',
        country: address.country || country || 'United Kingdom',
        fullAddress: address.fullAddress ||
          `${address.buildingNumber || ''} ${address.street || ''}, ${address.city || ''}, ${address.county || ''}, ${address.postcode || address.zipCode || ''}`.replace(/\s+/g, ' ').replace(/, ,/g, ',').replace(/^, |, $/g, '').trim()
      };
    } else {
      // No address provided - use empty structure
      businessData.address = {
        fullAddress: '',
        country: country || 'United Kingdom'
      };
    }

    // Handle location - REQUIRED for geofencing feature
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Business location (latitude and longitude) is required for geofencing functionality. Please enable location services and try again.'
      });
    }

    businessData.location = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)]
    };

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

    // Handle external profiles (only add if provided)
    if (req.body.tripAdvisorUrl || tripAdvisorLink || googleBusinessName) {
      businessData.externalProfiles = {
        tripAdvisor: {
          profileUrl: req.body.tripAdvisorUrl || tripAdvisorLink || ''
        },
        googleBusiness: {
          businessName: googleBusinessName || ''
        }
      };
    }

    // Handle logo - can be URL from Cloudinary or file
    if (req.body.logo) {
      if (typeof req.body.logo === 'string') {
        // URL provided (from Cloudinary)
        businessData.logo = {
          url: req.body.logo,
          publicId: req.body.logoPublicId || null
        };
      } else if (req.files && req.files.logo) {
        // File uploaded via multipart/form-data
        businessData.logo = {
          url: `/uploads/${req.files.logo[0].filename}`,
          publicId: req.files.logo[0].filename
        };
      }
    }

    // Handle cover image - can be URL from Cloudinary or file
    if (req.body.coverImage) {
      if (typeof req.body.coverImage === 'string') {
        // URL provided (from Cloudinary)
        businessData.coverImage = {
          url: req.body.coverImage,
          publicId: req.body.coverImagePublicId || null
        };
      } else if (req.files && req.files.coverImage) {
        // File uploaded via multipart/form-data
        businessData.coverImage = {
          url: `/uploads/${req.files.coverImage[0].filename}`,
          publicId: req.files.coverImage[0].filename
        };
      }
    }

    // Handle business gallery images
    if (req.body.images && Array.isArray(req.body.images)) {
      businessData.images = req.body.images.map(img => {
        if (typeof img === 'string') {
          // URL provided (from Cloudinary)
          return {
            url: img,
            publicId: null
          };
        } else if (img.url) {
          // Object with url and publicId
          return {
            url: img.url,
            publicId: img.publicId || null
          };
        }
        return null;
      }).filter(img => img !== null);
    } else if (req.files && req.files.images) {
      // Files uploaded via multipart/form-data
      businessData.images = req.files.images.map(file => ({
        url: `/uploads/${file.filename}`,
        publicId: file.filename
      }));
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

    // Create business
    console.log('Creating business with data:', JSON.stringify(businessData, null, 2));
    const business = await Business.create(businessData);
    console.log('✅ Business created successfully:', business._id);

    // Log image data to verify it's saved
    console.log('📸 Business images after creation:', {
      logo: business.logo ? '✅ Present' : '❌ Missing',
      coverImage: business.coverImage ? '✅ Present' : '❌ Missing',
      galleryCount: business.images?.length || 0,
      logoUrl: business.logo?.url?.substring(0, 50) || 'N/A',
      coverUrl: business.coverImage?.url?.substring(0, 50) || 'N/A'
    });

    // Google Business name is stored in DB.
    // The daily cron at 2 AM will sync ratings automatically.
    // We deliberately do NOT sync immediately on registration:
    //   1. The business owner may have entered an incorrect Google Business name.
    //   2. Immediate sync wastes 1-2 API calls ($0.022-$0.057) before the name is verified.
    //   3. The business is 'pending' anyway and won't appear in user listings until approved.
    if (googleBusinessName && googleBusinessName.trim()) {
      console.log(`📝 Google Business name saved for: ${business._id}. Will sync on next daily cron at 2 AM.`);
      // Auto-sync removed — daily cron (syncJobs.js) handles initial and ongoing sync.
    }

    res.status(201).json({
      success: true,
      message: 'Business registered successfully. Awaiting admin approval and verification.',
      business
    });
  } catch (error) {
    console.error('❌ Business registration error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    next(error);
  }
};

// @desc    Upload business documents
// @route   POST /api/business/:id/documents
// @access  Private (Business owner)
exports.uploadDocuments = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this business'
      });
    }

    // Check if files exist
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No documents uploaded'
      });
    }

    // Handle file uploads
    let hasAddressProof = false;
    let hasSelfie = false;

    if (req.files.addressProof) {
      business.documents.addressProof = {
        url: `/uploads/${req.files.addressProof[0].filename}`,
        verified: false,
        status: 'pending'
      };
      hasAddressProof = true;
    }

    if (req.files.selfie) {
      const selfieUrl = `/uploads/${req.files.selfie[0].filename}`;
      // const selfieFilename = req.files.selfie[0].filename;

      business.documents.selfie = {
        url: selfieUrl,
        verified: false,
        status: 'pending'
      };
      // Also update legacy root fields for backward compatibility
      business.selfieUrl = selfieUrl;

      // Update User (BusinessOwner) profile photo as requested
      // "not buisness logo it shuld user profile photo"
      try {
        const BusinessOwner = require('../models/BusinessOwner.model');
        const User = require('../models/User.model');

        // Try finding owner in BusinessOwner collection first
        let owner = await BusinessOwner.findById(req.user.id);
        if (!owner) {
          // Fallback to User collection
          owner = await User.findById(req.user.id);
        }

        if (owner) {
          owner.profileImage = selfieUrl;
          await owner.save();
          console.log(`✅ Updated owner profile image from KYC selfie: ${owner._id}`);
        }
      } catch (err) {
        console.error('Failed to update owner profile image:', err);
      }

      hasSelfie = true;
    }

    // Handle other optional documents if they exist (backward compatibility or future use)
    if (req.files.ownerIdProof) {
      business.documents.ownerIdProof = {
        url: `/uploads/${req.files.ownerIdProof[0].filename}`,
        verified: false,
        status: 'pending'
      };
    }
    if (req.files.foodSafetyCertificate) {
      business.documents.foodSafetyCertificate = {
        url: `/uploads/${req.files.foodSafetyCertificate[0].filename}`,
        verified: false,
        status: 'pending'
      };
    }
    if (req.files.businessLicense) {
      business.documents.businessLicense = {
        url: `/uploads/${req.files.businessLicense[0].filename}`,
        verified: false,
        status: 'pending'
      };
    }

    // Validation: Require Address Proof and Selfie
    // If not all mandatory documents are present (and not already present in DB), reject
    const addressProofPresent = hasAddressProof || (business.documents.addressProof && business.documents.addressProof.url);
    const selfiePresent = hasSelfie || (business.documents.selfie && business.documents.selfie.url);

    if (!addressProofPresent || !selfiePresent) {
      return res.status(400).json({
        success: false,
        message: 'Both Address Proof and Selfie are required to complete KYC.'
      });
    }

    // Update status only if mandatory docs are present
    business.kycStatus = 'in_review';
    await business.save();

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      business
    });
  } catch (error) {
    console.error('Upload documents error:', error);
    next(error);
  }
};

// @desc    Get nearby businesses
// @route   GET /api/business/nearby
// @access  Public
exports.getNearbyBusinesses = async (req, res, next) => {
  try {
    const { latitude, longitude, radius, category, ratingSource, minRating, distance, search, query: legacyQuery } = req.query;

    console.log('🌍 getNearbyBusinesses request:', {
      latitude,
      longitude,
      distance,
      radius,
      ratingSource,
      minRating,
      category,
      search: search || legacyQuery
    });

    if (!latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude are required'
      });
    }

    // Distance filter options (in meters)
    // distance can be: '1km', '5km', '10km', '25km', 'nearme', or custom radius
    let maxDistance;
    if (distance === 'nearme') {
      maxDistance = 2000; // 2km for "Near Me" - truly nearby businesses
      console.log('   📍 Distance filter: Near Me (2km)');
    } else if (distance === '1km') {
      maxDistance = 1000;
      console.log('   📍 Distance filter: 1km');
    } else if (distance === '5km') {
      maxDistance = 5000;
      console.log('   📍 Distance filter: 5km');
    } else if (distance === '10km') {
      maxDistance = 10000;
      console.log('   📍 Distance filter: 10km');
    } else if (distance === '25km') {
      maxDistance = 25000;
      console.log('   📍 Distance filter: 25km');
    } else {
      maxDistance = parseInt(radius) || 50000; // Default 50km
      console.log(`   📍 Distance filter: Default (${maxDistance / 1000}km)`);
    }

    // Show only active businesses on user home page
    const query = {
      status: 'active', // Only show active businesses
    };

    // Search query (backend handles case-insensitive search)
    const searchTerm = search || legacyQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      query.$or = [
        { name: { $regex: searchTerm.trim(), $options: 'i' } },
        { description: { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.fullAddress': { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.city': { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.area': { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.state': { $regex: searchTerm.trim(), $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      const trimmedCategory = category.trim();
      query.category = {
        $regex: new RegExp(`^${escapeRegExp(trimmedCategory)}$`, 'i')
      };
    }

    // Server-side star-based rating filters
    if (ratingSource && minRating) {
      const minRatingValue = parseFloat(minRating);

      // Filter by specific rating source and star level
      if (ratingSource === 'hashview') {
        query['rating.average'] = { $gte: minRatingValue };
      } else if (ratingSource === 'google') {
        query['externalProfiles.googleBusiness.rating'] = { $gte: minRatingValue };
      } else if (ratingSource === 'tripadvisor') {
        query['externalProfiles.tripAdvisor.rating'] = { $gte: minRatingValue };
      }
    }

    // Pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    console.log(`   🔍 Executing MongoDB $near query with maxDistance: ${maxDistance}m`);

    // Count total matching documents for pagination metadata (expensive for $near, may skip or use estimation)
    // Note: $near does not support count() efficiently with query modifiers sometimes, but we try.
    // For geospatial, usually we limit the total query anyway.

    // Use aggregation for the main results (fixes $near sorting issue)
    const businesses = await Business.aggregate([
      {
        $geoNear: {
          near: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          distanceField: "dist.calculated", // Distance in meters
          maxDistance: maxDistance,
          query: query, // Apply filters (status, category, search, etc.)
          spherical: true,
          key: "location"
        }
      },
      { $sort: { "dist.calculated": 1, _id: 1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          documents: 0,
          externalReviews: 0,
          openingHours: 0
        }
      },
      {
        $addFields: {
          images: {
            $cond: {
              if: { $isArray: "$images" },
              then: { $slice: ["$images", 1] },
              else: "$images"
            }
          }
        }
      }
    ]);

    // Use $geoWithin for counting (avoids $near sort issues)
    const countQuery = { ...query };
    countQuery.location = {
      $geoWithin: {
        $centerSphere: [
          [parseFloat(longitude), parseFloat(latitude)],
          maxDistance / 6378137 // Convert meters to radians
        ]
      }
    };

    // Get total count
    const total = await Business.countDocuments(countQuery);

    console.log(`   📊 MongoDB returned ${businesses.length} businesses (Page ${page}, Limit ${limit})`);

    // Calculate distance for each business and add to response
    const businessesWithDistance = businesses.map((business, index) => {
      // Aggregation returns POJOs, no need for toObject()
      const businessObj = business;
      if (business.location && business.location.coordinates && business.location.coordinates.length === 2) {
        const busLon = business.location.coordinates[0];
        const busLat = business.location.coordinates[1];

        const distanceInMeters = calculateDistance(
          parseFloat(latitude),
          parseFloat(longitude),
          busLat,
          busLon
        );

        const distanceInKm = distanceInMeters / 1000;
        businessObj.distance = distanceInKm; // Convert to KM for frontend

        // Log first 3 businesses
        if (index < 3) {
          console.log(`      ${index + 1}. ${business.name}: ${distanceInKm.toFixed(2)}km (${distanceInMeters.toFixed(0)}m)`);
        }
      } else {
        console.log(`   ⚠️ Business ${business._id} (${business.name}) has missing or invalid coordinates`);
        businessObj.distance = null;
      }
      return businessObj;
    });

    console.log(`   ✅ Found ${businessesWithDistance.length} businesses within ${maxDistance / 1000}km`);
    if (businessesWithDistance.length > 0) {
      const distances = businessesWithDistance.map(b => b.distance).filter(d => d !== undefined);
      if (distances.length > 0) {
        const minDistance = Math.min(...distances);
        const maxDistanceFound = Math.max(...distances);
        console.log(`      📏 Distance range: ${minDistance.toFixed(2)}km - ${maxDistanceFound.toFixed(2)}km`);
      }
    } else {
      console.log('      ⚠️ No businesses found with valid coordinates in range');
    }

    res.status(200).json({
      success: true,
      count: businessesWithDistance.length,
      total,
      pagination: {
        page: page,
        pages: Math.ceil(total / limit)
      },
      businesses: businessesWithDistance,
      filters: {
        radius: maxDistance,
        ratingSource: ratingSource || null,
        minRating: minRating || null,
        category: category || null
      }
    });
  } catch (error) {
    console.error('❌ getNearbyBusinesses error:', error);
    next(error);
  }
};

// @desc    Get all active businesses (without location filter)
// @route   GET /api/business/all
// @access  Public
const escapeRegExp = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

exports.getAllActiveBusinesses = async (req, res, next) => {
  try {
    const { category, limit, ratingSource, minRating, search, query: legacyQuery } = req.query;

    console.log('📋 getAllActiveBusinesses request:', { category, ratingSource, minRating, limit, search: search || legacyQuery });

    const query = { status: 'active' };

    // Search query (backend handles case-insensitive search)
    const searchTerm = search || legacyQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      query.$or = [
        { name: { $regex: searchTerm.trim(), $options: 'i' } },
        { description: { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.fullAddress': { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.city': { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.area': { $regex: searchTerm.trim(), $options: 'i' } },
        { 'address.state': { $regex: searchTerm.trim(), $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      const trimmedCategory = category.trim();
      query.category = {
        $regex: new RegExp(`^${escapeRegExp(trimmedCategory)}$`, 'i')
      };
    }

    // Server-side star-based rating filters
    if (ratingSource && minRating) {
      const minRatingValue = parseFloat(minRating);

      console.log(`   🎯 Applying ${ratingSource} rating filter: ≥${minRatingValue} stars`);

      // Filter by specific rating source and star level
      if (ratingSource === 'hashview') {
        query['rating.average'] = { $gte: minRatingValue };
      } else if (ratingSource === 'google') {
        query['externalProfiles.googleBusiness.rating'] = { $gte: minRatingValue };
      } else if (ratingSource === 'tripadvisor') {
        query['externalProfiles.tripAdvisor.rating'] = { $gte: minRatingValue };
      }
    }

    const page = parseInt(req.query.page, 10) || 1;
    const queryLimit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * queryLimit;

    console.log('   📊 MongoDB query:', JSON.stringify(query, null, 2));

    const businesses = await Business.find(query)
      .select('-documents -externalReviews -openingHours')
      .skip(skip)
      .limit(queryLimit)
      .sort({ 'rating.average': -1 }); // Sort by highest rated first

    const total = await Business.countDocuments(query);

    console.log(`   ✅ Found ${businesses.length} businesses (Page ${page}, Limit ${queryLimit})`);
    businesses.forEach((b, i) => {
      console.log(`      ${i + 1}. ${b.name} - Google: ${b.externalProfiles?.googleBusiness?.rating || 'N/A'}, HashView: ${b.rating?.average || 0}`);
    });

    res.status(200).json({
      success: true,
      count: businesses.length,
      total,
      pagination: {
        page: page,
        pages: Math.ceil(total / queryLimit)
      },
      businesses,
      filters: {
        ratingSource: ratingSource || null,
        minRating: minRating || null,
        category: category || null
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Search businesses
// @route   GET /api/business/search
// @access  Public
exports.searchBusinesses = async (req, res, next) => {
  try {
    const {
      search,        // Real-time search query
      query,         // Legacy query param (for backward compatibility)
      category,
      city,
      ratingSource,
      minRating,
      latitude,      // User's location for distance sorting
      longitude,
      limit          // Limit results (for autocomplete)
    } = req.query;

    console.log('🔍 Search request:', { search, query, latitude, longitude, limit });

    // Show only active businesses for user search
    const searchQuery = { status: 'active' };

    // Real-time search by name or location
    const searchTerm = search || query;
    if (searchTerm) {
      searchQuery.$or = [
        { name: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { 'address.fullAddress': { $regex: searchTerm, $options: 'i' } },
        { 'address.city': { $regex: searchTerm, $options: 'i' } },
        { 'address.area': { $regex: searchTerm, $options: 'i' } },
        { 'address.state': { $regex: searchTerm, $options: 'i' } }
      ];
    }

    if (category && category !== 'all') {
      const trimmedCategory = category.trim();
      searchQuery.category = {
        $regex: new RegExp(`^${escapeRegExp(trimmedCategory)}$`, 'i')
      };
    }

    if (city) {
      searchQuery['address.city'] = { $regex: city, $options: 'i' };
    }

    // Server-side star-based rating filters
    if (ratingSource && minRating) {
      const minRatingValue = parseFloat(minRating);

      // Filter by specific rating source and star level
      if (ratingSource === 'hashview') {
        searchQuery['rating.average'] = { $gte: minRatingValue };
      } else if (ratingSource === 'google') {
        searchQuery['externalProfiles.googleBusiness.rating'] = { $gte: minRatingValue };
      } else if (ratingSource === 'tripadvisor') {
        searchQuery['externalProfiles.tripAdvisor.rating'] = { $gte: minRatingValue };
      }
    }

    // Fetch businesses
    let businesses = await Business.find(searchQuery)
      .select('-documents -externalReviews -openingHours')
      .limit(parseInt(limit) || 50); // Default 50, or use limit param for autocomplete

    // Calculate distance if user location provided
    if (latitude && longitude) {
      const userLat = parseFloat(latitude);
      const userLon = parseFloat(longitude);

      // Add distance to each business
      businesses = businesses.map(business => {
        const businessLat = business.location.coordinates[1];
        const businessLon = business.location.coordinates[0];
        const distance = calculateDistance(userLat, userLon, businessLat, businessLon);

        return {
          ...business.toObject(),
          distance: distance / 1000 // Convert to kilometers
        };
      });

      // Sort by distance (nearest first)
      businesses.sort((a, b) => a.distance - b.distance);
    } else {
      // No location provided, sort by rating
      businesses.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    }

    console.log(`✅ Found ${businesses.length} businesses`);

    res.status(200).json({
      success: true,
      count: businesses.length,
      businesses,
      filters: {
        search: searchTerm || null,
        ratingSource: ratingSource || null,
        minRating: minRating || null,
        category: category || null,
        hasLocation: !!(latitude && longitude)
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single business
// @route   GET /api/business/:id
// @access  Public
exports.getBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id)
      .select('-documents');

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Calculate if business is open NOW (backend handles all logic)
    const isOpenNow = checkIfBusinessIsOpen(business.openingHours);

    res.status(200).json({
      success: true,
      business: {
        ...business.toObject(),
        isOpenNow: isOpenNow.isOpen,
        openStatus: isOpenNow.status,
        nextStateChange: isOpenNow.nextChange
      }
    });
  } catch (error) {
    next(error);
  }
};

// Helper function to check if business is open NOW (server-side logic)
function checkIfBusinessIsOpen(openingHours) {
  if (!openingHours) {
    return { isOpen: null, status: 'Hours not set', nextChange: null };
  }

  const now = new Date();
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDay = days[now.getDay()];
  const todayHours = openingHours[currentDay];

  if (!todayHours || todayHours.closed || todayHours.open === 'Closed') {
    return { isOpen: false, status: 'Closed today', nextChange: null };
  }

  // Parse time strings (e.g., "09:00 AM")
  const parseTime = (timeStr) => {
    if (!timeStr || timeStr === 'Closed') return null;
    const [time, period] = timeStr.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes; // Return minutes since midnight
  };

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = parseTime(todayHours.open);
  const closeMinutes = parseTime(todayHours.close);

  if (openMinutes === null || closeMinutes === null) {
    return { isOpen: null, status: 'Hours not set', nextChange: null };
  }

  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;

  let status, nextChange;
  if (isOpen) {
    status = `Open • Closes at ${todayHours.close}`;
    nextChange = todayHours.close;
  } else if (currentMinutes < openMinutes) {
    status = `Closed • Opens at ${todayHours.open}`;
    nextChange = todayHours.open;
  } else {
    status = 'Closed';
    // Find next opening day
    for (let i = 1; i <= 7; i++) {
      const nextDayIndex = (now.getDay() + i) % 7;
      const nextDay = days[nextDayIndex];
      const nextDayHours = openingHours[nextDay];

      if (nextDayHours && !nextDayHours.closed && nextDayHours.open !== 'Closed') {
        status = `Closed • Opens ${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)} at ${nextDayHours.open}`;
        break;
      }
    }
  }

  return { isOpen, status, nextChange };
}

// @desc    Get business dashboard data
// @route   GET /api/business/:id/dashboard
// @access  Private (Business owner)
exports.getBusinessDashboard = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Get reviews
    const reviews = await Review.find({ business: business._id })
      .populate('user', 'name profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get analytics
    const totalReviews = await Review.countDocuments({ business: business._id });
    const avgRating = await Review.aggregate([
      { $match: { business: business._id } },
      { $group: { _id: null, avg: { $avg: '$rating' } } }
    ]);

    // Get reviews by rating
    const ratingDistribution = await Review.aggregate([
      { $match: { business: business._id } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    const unreadNotifications = await Notification.countDocuments({
      recipientType: 'business',
      recipientId: business._id,
      isRead: false
    });

    // Fetch Active Orders (Phase 5)
    const activeOrdersCount = await Order.countDocuments({
      business: business._id,
      status: { $nin: ['delivered', 'cancelled'] }
    });

    res.status(200).json({
      success: true,
      data: {
        business,
        dashboard: {
          recentReviews: reviews,
          analytics: {
            totalReviews,
            averageRating: avgRating[0]?.avg || 0,
            ratingDistribution
          },
          unreadNotifications,
          activeOrders: activeOrdersCount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

const { generateBusinessQR } = require('../services/qrService');

// @desc    Generate QR code for business
// @route   POST /api/business/:id/generate-qr
// @access  Private (Business owner)
exports.generateQRCode = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Generate QR code and upload to Cloudinary using qrService
    const qrCodeUrl = await generateBusinessQR(business._id.toString());
    
    res.status(200).json({
      success: true,
      message: 'QR code generated successfully',
      qrCode: qrCodeUrl
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download high-res QR image
// @route   GET /api/business/:id/qr
// @access  Public
exports.getBusinessQRImage = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business || !business.qrCode) {
      return res.status(404).json({ success: false, message: 'QR Code not found for this business' });
    }
    // Redirect to the Cloudinary URL
    res.redirect(business.qrCode);
  } catch (error) {
    next(error);
  }
};

// @desc    Get print-ready PDF/HTML for QR code
// @route   GET /api/business/:id/qr/print
// @access  Private (Business owner)
exports.getBusinessQRPrint = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }
    if (!business.qrCode) {
      return res.status(400).json({ success: false, message: 'QR Code not generated yet. Please generate it first.' });
    }

    // Return a simple print-ready HTML page
    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Print QR Code - ${business.name}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 0; padding: 40px; background: #fff; color: #333; }
        .container { border: 2px dashed #ccc; padding: 40px; max-width: 600px; margin: 0 auto; border-radius: 12px; }
        h1 { font-size: 32px; margin-bottom: 10px; color: #210059; }
        p { font-size: 18px; color: #555; margin-bottom: 30px; }
        img { max-width: 100%; height: auto; margin-bottom: 20px; }
        .instructions { font-size: 14px; color: #888; margin-top: 40px; }
        @media print {
          body { padding: 0; }
          .container { border: none; padding: 0; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="no-print" style="margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #210059; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">Print this page</button>
      </div>
      <div class="container">
        <h1>${business.name}</h1>
        <p>Scan the QR code below to view our menu and order!</p>
        <img src="${business.qrCode}" alt="${business.name} QR Code" />
        <p class="instructions">Powered by HashView</p>
      </div>
    </body>
    </html>
    `;
    
    res.send(html);
  } catch (error) {
    next(error);
  }
};

// @desc    Get business by QR code data (Public endpoint for mobile app)
// @route   POST /api/business/qr/scan
// @access  Public
exports.getBusinessByQRCode = async (req, res, next) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    const { parseQRCodeData } = require('../utils/qrcode');

    // Parse QR code data
    const parsed = parseQRCodeData(qrData);

    if (!parsed.valid || !parsed.businessId) {
      return res.status(400).json({
        success: false,
        message: parsed.error || 'Invalid QR code'
      });
    }

    // Find business by ID
    const business = await Business.findById(parsed.businessId)
      .populate('owner', 'name email phone')
      .select('-qrCode'); // Don't send QR code back to mobile

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Only return active businesses
    if (business.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This business is not active'
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

// @desc    Update business images (logo, cover, gallery)
// @route   PUT /api/business/:id/images
// @access  Private (Business owner)
exports.updateBusinessImages = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // ✅ Null-safe ownership check — business.owner can be null for admin-seeded records
    const ownerId = business.owner?.toString?.() ?? null;
    const isOwner = ownerId !== null && ownerId === req.user.id;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this business'
      });
    }

    const updateData = {};

    // ─────────────────────────────────────────────────────────────────────────
    // IMPORTANT: We do NOT delete old Cloudinary assets before saving the new
    // data. Deleting first and then failing to save leaves the business with
    // NO images at all — a permanent, unrecoverable loss.
    //
    // The safe pattern is:
    //   1. Accept the new data into updateData (no deletion yet)
    //   2. Save to MongoDB successfully
    //   3. ONLY THEN delete the old Cloudinary asset (deferred cleanup)
    //
    // If step 3 fails (Cloudinary error), the old file stays in Cloudinary as
    // a harmless orphan. That is infinitely preferable to losing user data.
    // ─────────────────────────────────────────────────────────────────────────

    // Collect old publicIds to delete AFTER successful DB save
    const toDeleteAfterSave = [];

    // Update logo
    if (req.body.logo) {
      // If there's an existing logo with a different publicId, queue it for cleanup
      const incomingPublicId = req.body.logoPublicId || null;
      const existingPublicId = business.logo?.publicId || null;
      if (existingPublicId && existingPublicId !== incomingPublicId) {
        toDeleteAfterSave.push({ publicId: existingPublicId, type: 'logo' });
      }

      if (typeof req.body.logo === 'string') {
        updateData.logo = {
          url: req.body.logo,
          publicId: incomingPublicId
        };
      }
    }

    // Update cover image
    if (req.body.coverImage) {
      const incomingPublicId = req.body.coverImagePublicId || null;
      const existingPublicId = business.coverImage?.publicId || null;
      if (existingPublicId && existingPublicId !== incomingPublicId) {
        toDeleteAfterSave.push({ publicId: existingPublicId, type: 'cover' });
      }

      if (typeof req.body.coverImage === 'string') {
        updateData.coverImage = {
          url: req.body.coverImage,
          publicId: incomingPublicId
        };
      }
    }

    // Update gallery images
    if (req.body.images !== undefined) {
      if (Array.isArray(req.body.images)) {
        const incomingPublicIds = new Set(
          req.body.images.map(img => (typeof img === 'object' ? img.publicId : null)).filter(Boolean)
        );

        // Only queue gallery images that are truly being REMOVED (not in the new list)
        if (business.images && business.images.length > 0) {
          for (const img of business.images) {
            if (img.publicId && !incomingPublicIds.has(img.publicId)) {
              toDeleteAfterSave.push({ publicId: img.publicId, type: 'gallery' });
            }
          }
        }

        updateData.images = req.body.images.map(img => {
          if (typeof img === 'string') {
            return { url: img, publicId: null };
          } else if (img.url) {
            return { url: img.url, publicId: img.publicId || null };
          }
          return null;
        }).filter(img => img !== null);
      } else {
        // Explicit empty array — queue all existing gallery for cleanup
        if (business.images && business.images.length > 0) {
          for (const img of business.images) {
            if (img.publicId) toDeleteAfterSave.push({ publicId: img.publicId, type: 'gallery' });
          }
        }
        updateData.images = [];
      }
    }

    // ── Step 1: Save new data to MongoDB first ────────────────────────────
    Object.assign(business, updateData);
    await business.save();

    // ── Step 2: DB save succeeded — NOW it is safe to delete old Cloudinary assets
    if (toDeleteAfterSave.length > 0) {
      console.log(`🗑️  Deferred cleanup: deleting ${toDeleteAfterSave.length} old Cloudinary asset(s)...`);
      for (const item of toDeleteAfterSave) {
        try {
          await cloudinary.uploader.destroy(item.publicId);
          console.log(`✅ Deleted old ${item.type}: ${item.publicId}`);
        } catch (err) {
          // Non-fatal: the DB already has the new data. The old file stays as an
          // orphan in Cloudinary, which is harmless and can be cleaned up later.
          console.warn(`⚠️  Could not delete old ${item.type} (${item.publicId}):`, err.message);
        }
      }
    }

    // Refresh business data to ensure all fields are populated
    const updatedBusiness = await Business.findById(req.params.id)
      .populate('owner', 'name email')
      .lean();

    console.log('✅ Business images updated in database:', {
      businessId: business._id,
      logo: updatedBusiness.logo ? 'present' : 'missing',
      coverImage: updatedBusiness.coverImage ? 'present' : 'missing',
      galleryCount: updatedBusiness.images?.length || 0
    });

    res.status(200).json({
      success: true,
      message: 'Business images updated successfully',
      business: updatedBusiness
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business
// @route   PUT /api/business/:id
// @access  Private (Business owner)
exports.updateBusiness = async (req, res, next) => {
  try {
    const business = await Business.findById(req.params.id);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // ✅ Null-safe ownership check
    const ownerId = business.owner?.toString?.() ?? null;
    if (ownerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const allowedUpdates = ['name', 'description', 'email', 'phone', 'address', 'category', 'openingHours', 'socialMedia', 'website'];
    const updates = {};

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    // Handle address if provided as string
    if (req.body.address && typeof req.body.address === 'string') {
      updates.address = {
        fullAddress: req.body.address
      };
    } else if (req.body.address && typeof req.body.address === 'object') {
      updates.address = req.body.address;
    }

    // Handle socialMedia website separately
    if (req.body.website !== undefined) {
      if (!updates.socialMedia) {
        updates.socialMedia = business.socialMedia || {};
      }
      updates.socialMedia.website = req.body.website;
    }

    const updatedBusiness = await Business.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Business updated successfully',
      business: updatedBusiness
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my businesses
// @route   GET /api/business/my/businesses
// @access  Private (Business owner)
exports.getMyBusinesses = async (req, res, next) => {
  try {
    const businesses = await Business.find({ owner: req.user.id });

    res.status(200).json({
      success: true,
      count: businesses.length,
      businesses
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manually update TripAdvisor rating and review count
// @route   PUT /api/business/:id/tripadvisor-rating
// @access  Private (Business owner, Admin)
exports.updateTripAdvisorRating = async (req, res, next) => {
  try {
    const { rating, reviewCount, profileUrl } = req.body;

    console.log('📝 TripAdvisor update request:', { rating, reviewCount, profileUrl });

    // Validate rating if provided
    if (rating !== undefined && rating !== null && rating !== '') {
      const parsedRating = parseFloat(rating);
      if (isNaN(parsedRating) || parsedRating < 0 || parsedRating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be a valid number between 0 and 5'
        });
      }
    }

    // Validate review count if provided
    if (reviewCount !== undefined && reviewCount !== null && reviewCount !== '') {
      const parsedCount = parseInt(reviewCount);
      if (isNaN(parsedCount) || parsedCount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Review count must be a valid positive number'
        });
      }
    }

    const business = await Business.findById(req.params.id);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    // Authorization check - must be business owner or admin
    if (business.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this business'
      });
    }

    // Initialize externalProfiles if needed
    if (!business.externalProfiles) {
      business.externalProfiles = {};
    }
    if (!business.externalProfiles.tripAdvisor) {
      business.externalProfiles.tripAdvisor = {};
    }

    // Track if any updates were made
    let updated = false;

    // Update TripAdvisor fields (only if valid values provided)
    if (rating !== undefined && rating !== null && rating !== '') {
      const parsedRating = parseFloat(rating);
      if (!isNaN(parsedRating)) {
        business.externalProfiles.tripAdvisor.rating = parsedRating;
        console.log('✅ Updated rating:', parsedRating);
        updated = true;
      }
    }

    if (reviewCount !== undefined && reviewCount !== null && reviewCount !== '') {
      const parsedCount = parseInt(reviewCount);
      if (!isNaN(parsedCount)) {
        business.externalProfiles.tripAdvisor.reviewCount = parsedCount;
        console.log('✅ Updated review count:', parsedCount);
        updated = true;
      }
    }

    if (profileUrl !== undefined && profileUrl !== null && profileUrl !== '') {
      business.externalProfiles.tripAdvisor.profileUrl = profileUrl.trim();
      console.log('✅ Updated profile URL:', profileUrl);
      updated = true;
    }

    // Only update lastSynced if something was actually updated
    if (updated) {
      business.externalProfiles.tripAdvisor.lastSynced = new Date();
      await business.save();
      console.log('✅ TripAdvisor data saved successfully');
    } else {
      return res.status(400).json({
        success: false,
        message: 'No valid data provided to update. Please provide rating, review count, or profile URL.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'TripAdvisor rating updated successfully',
      data: {
        rating: business.externalProfiles.tripAdvisor.rating,
        reviewCount: business.externalProfiles.tripAdvisor.reviewCount,
        profileUrl: business.externalProfiles.tripAdvisor.profileUrl,
        lastSynced: business.externalProfiles.tripAdvisor.lastSynced
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Bulk upload businesses from Excel
// @route   POST /api/business/bulk-upload
// @access  Private (Admin only)
exports.bulkUploadBusinesses = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an Excel file' });
    }

    // Parse Excel file
    const rows = ExcelParser.parseBuffer(req.file.buffer);

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    console.log(`\n📊 Bulk Upload: Processing ${rows.length} rows`);

    const results = {
      total: rows.length,
      success: 0,
      failed: 0,
      errors: []
    };

    const successData = [];

    // Process each row sequentially to manage Geocoding rate limits
    // Using for...of loop for async/await
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // Excel row number (1-based + 1 header)

      try {
        // 1. Basic Validation
        if (!row.Name || !row.Category) {
          throw new Error('Missing require fields: Name or Category');
        }

        // 2. Geocoding / Location Strategy
        let latitude = row.Latitude;
        let longitude = row.Longitude;
        let formattedAddress = row.Address;

        // If coordinates missing, try to geocode
        if (!latitude || !longitude) {
          // Construct address string for geocoding
          const addressParts = [
            row.BuildingNumber,
            row.Street,
            row.City,
            row.Postcode,
            row.Country || 'United Kingdom'
          ].filter(Boolean).join(', ');

          if (addressParts.length > 5) { // Minimal check for valid address string
            try {
              // Add a small delay to avoid rate limiting (e.g., 200ms)
              await new Promise(resolve => setTimeout(resolve, 200));

              const geoResult = await geocodeAddress(addressParts, row.Name);
              latitude = geoResult.latitude;
              longitude = geoResult.longitude;
              // If address was vague, we might use the formatted one from Google
              if (!formattedAddress) formattedAddress = geoResult.formattedAddress;
            } catch (geoError) {
              console.warn(`⚠️  Row ${rowNum}: Geocoding failed for "${addressParts}"`);
              // Proceed without coordinates if we must, or fail? 
              // Decision: Fail this row if location is strictly required for app functionality
              throw new Error(`Geocoding failed for address: ${addressParts}. Please provide manual coordinates.`);
            }
          } else {
            throw new Error('No location coordinates and insufficient address details for geocoding');
          }
        }

        // 3. Prepare Business Object
        const businessData = {
          name: row.Name,
          description: row.Description || '',
          category: row.Category.toLowerCase(), // Normalize category
          phone: row.Phone ? String(row.Phone).replace(/[\s\-\(\)]/g, '') : '',
          email: row.Email || '',
          website: row.Website || '',


          // Image Handling (URLs only)
          logo: row.LogoUrl ? { url: row.LogoUrl, publicId: null } : undefined,
          coverImage: row.CoverImageUrl ? { url: row.CoverImageUrl, publicId: null } : undefined,
          images: row.GalleryImageUrls ? row.GalleryImageUrls.split(',').map(url => ({ url: url.trim(), publicId: null })) : [],

          // ✅ Do NOT set owner for bulk-imported businesses. These are admin-seeded
          // records with no individual user owner. Users claim them via the claim system.
          // Setting owner: req.user.id would lock them to the admin account and cause
          // all 74 businesses to appear as 'owner null' when admin account changes.
          importedBy: req.user.id, // Track who imported (metadata only, not ownership)
          status: 'active',
          kycStatus: 'approved',

          address: {
            buildingNumber: row.BuildingNumber || '',
            street: row.Street || '',
            city: row.City || '',
            county: row.County || '',
            postcode: row.Postcode || '',
            country: row.Country || 'United Kingdom',
            fullAddress: formattedAddress || ''
          },

          location: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },

          radius: parseInt(row.Radius) || 50,
        };

        // 4. DUPLICATE CHECK: Prevent exact same name at exact same location
        const duplicateBusiness = await Business.findOne({
          name: { $regex: new RegExp(`^${businessData.name.trim()}$`, 'i') }, // Case-insensitive exact match
          'location.coordinates': [parseFloat(longitude), parseFloat(latitude)]
        });

        if (duplicateBusiness) {
          throw new Error('A business with this exact name is already registered at this location.');
        }

        // 5. Create Business
        const newBusiness = await Business.create(businessData);

        results.success++;
        successData.push({ row: rowNum, name: newBusiness.name, id: newBusiness._id });
        console.log(`✅ Row ${rowNum}: Created "${newBusiness.name}"`);

      } catch (error) {
        results.failed++;
        results.errors.push({
          row: rowNum,
          name: row.Name || 'Unknown',
          error: error.message
        });
        console.error(`❌ Row ${rowNum} Failed:`, error.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Processed ${rows.length} businesses. Success: ${results.success}, Failed: ${results.failed}`,
      results
    });

  } catch (error) {
    console.error('❌ Bulk Upload Error:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  BUSINESS CLAIM SYSTEM
// ─────────────────────────────────────────────────────────────
const User = require('../models/User.model');
const { sendEmail } = require('../utils/emailService');

// In-memory OTP store (for demo; use Redis/DB in production)
const claimOtpStore = new Map();

// @desc    Submit a claim request for an unclaimed business
// @route   POST /api/business/:id/claim
// @access  Private (any logged-in user)
exports.claimBusiness = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { businessEmail, role, agreedToTerms } = req.body;

    if (!businessEmail || !role || !agreedToTerms) {
      return res.status(400).json({ success: false, message: 'Business email, role, and agreement to terms are required.' });
    }

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found.' });

    // Already has an owner
    if (business.owner) {
      return res.status(400).json({ success: false, message: 'This business already has a registered owner.' });
    }

    // Check if there's already a claim request
    if (business.claimRequest) {
      if (business.claimRequest.status === 'pending') {
        return res.status(400).json({ success: false, message: 'A claim request for this business is already pending review.' });
      }
      if (business.claimRequest.status === 'approved') {
        return res.status(400).json({ success: false, message: 'This business already has an approved owner.' });
      }
      // If 'incomplete' or 'rejected', we allow updating/overwriting
    }

    // Save claim request — start as 'incomplete' until verified
    business.claimRequest = {
      status: 'incomplete',
      requestedBy: req.user.id,
      requestedAt: new Date(),
      businessEmail,
      role,
      agreedToTerms: true,
    };
    await business.save();

    // Notify admin via email (non-blocking)
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
    if (adminEmail) {
      sendEmail({
        to: adminEmail,
        subject: `New Business Claim Request — ${business.name}`,
        html: `<p>A new claim has been submitted for <strong>${business.name}</strong>.</p>
               <p><strong>Claimant:</strong> ${req.user.name} (${req.user.email})</p>
               <p><strong>Claimed Role:</strong> ${role}</p>
               <p><strong>Business Email:</strong> ${businessEmail}</p>
               <p>Please review this claim in the admin dashboard.</p>`
      }).catch(() => { });
    }

    // Notify claimant (non-blocking)
    sendEmail({
      to: req.user.email,
      subject: 'Your Business Claim Request Is Under Review — HashView',
      html: `<p>Hi ${req.user.name},</p>
             <p>Thank you for submitting a claim for <strong>${business.name}</strong>. Our team will review your request shortly.</p>
             <p>The next step is to <strong>verify your identity</strong>. Please upload your photo ID and selfie, or verify by phone, in the app.</p>
             <p>Best regards,<br/><strong>The HashView Team</strong></p>`
    }).catch(() => { });

    res.status(200).json({ success: true, message: 'Claim submitted successfully. Please complete identity verification.', claimRequest: business.claimRequest });
  } catch (error) {
    next(error);
  }
};

// @desc    Upload photo ID + selfie for claim verification (Step 2 — Document option)
// @route   POST /api/business/:id/claim/documents
// @access  Private (claimant)
exports.uploadClaimDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found.' });

    if (!business.claimRequest || !['incomplete', 'pending'].includes(business.claimRequest.status)) {
      return res.status(400).json({ success: false, message: 'No active claim request found to verify.' });
    }

    if (String(business.claimRequest.requestedBy) !== String(req.user.id)) {
      return res.status(403).json({ success: false, message: 'You are not the claimant for this business.' });
    }

    const updates = {};

    // Upload ownerIdProof to Cloudinary
    if (req.files?.ownerIdProof?.[0]) {
      const idProofFile = req.files.ownerIdProof[0];
      const uploadedId = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'hashview/claim-documents', resource_type: 'auto' },
          (error, result) => error ? reject(error) : resolve(result)
        );
        uploadStream.end(idProofFile.buffer);
      });
      updates['documents.ownerIdProof'] = { url: uploadedId.secure_url, publicId: uploadedId.public_id, status: 'pending', verified: false };
    }

    // Upload selfie to Cloudinary
    if (req.files?.selfie?.[0]) {
      const selfieFile = req.files.selfie[0];
      const uploadedSelfie = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          { folder: 'hashview/claim-selfies', resource_type: 'image' },
          (error, result) => error ? reject(error) : resolve(result)
        );
        uploadStream.end(selfieFile.buffer);
      });
      updates['documents.selfie'] = { url: uploadedSelfie.secure_url, publicId: uploadedSelfie.public_id, status: 'pending', verified: false };
    }

    updates['claimRequest.verificationMethod'] = 'document';
    updates['claimRequest.status'] = 'pending';
    await Business.findByIdAndUpdate(id, { $set: updates });

    res.status(200).json({ success: true, message: 'Documents uploaded successfully. Your claim is now under review by our team.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Send OTP to user's registered phone for claim phone verification
// @route   POST /api/business/:id/claim/send-phone-otp
// @access  Private (claimant)
exports.sendClaimPhoneOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found.' });

    if (!business.claimRequest || !['incomplete', 'pending'].includes(business.claimRequest.status)) {
      return res.status(400).json({ success: false, message: 'No active claim request found to verify.' });
    }

    const user = await User.findById(req.user.id);
    if (!user.phone) {
      return res.status(400).json({ success: false, message: 'No phone number registered to your account. Please add a phone number first.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store in memory (userId + businessId as key)
    claimOtpStore.set(`${req.user.id}_${id}`, { otp, expiry });

    // Send OTP via email (since SMS needs a provider like Twilio)
    await sendEmail({
      to: user.email,
      subject: 'Your Business Claim Phone Verification Code — HashView',
      html: `<p>Hi ${user.name},</p>
             <p>Your phone verification code for claiming <strong>${business.name}</strong> is:</p>
             <h1 style="letter-spacing:12px;color:#FF8C00;">${otp}</h1>
             <p>This code is valid for <strong>10 minutes</strong>.</p>
             <p>If you did not request this, please ignore this email.</p>`
    });

    res.status(200).json({ success: true, message: `OTP sent to your registered email (${user.email.replace(/(.{2}).*(@.*)/, '$1***$2')}). Check your inbox.`, phone: user.phone.replace(/\d(?=\d{4})/g, '*') });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP for phone-based claim verification
// @route   POST /api/business/:id/claim/verify-phone-otp
// @access  Private (claimant)
exports.verifyClaimPhoneOtp = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { otp } = req.body;

    if (!otp) return res.status(400).json({ success: false, message: 'OTP is required.' });

    const business = await Business.findById(id);
    if (!business) return res.status(404).json({ success: false, message: 'Business not found.' });

    if (!business.claimRequest || !['incomplete', 'pending'].includes(business.claimRequest.status)) {
      return res.status(400).json({ success: false, message: 'No active claim request found to verify.' });
    }

    const stored = claimOtpStore.get(`${req.user.id}_${id}`);
    if (!stored) return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    if (Date.now() > stored.expiry) {
      claimOtpStore.delete(`${req.user.id}_${id}`);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }
    if (stored.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP. Please try again.' });
    }

    // OTP valid — mark phone as verified, set verification method and move to pending status
    business.claimRequest.verificationMethod = 'phone';
    business.claimRequest.phoneVerified = true;
    business.claimRequest.status = 'pending';
    await business.save();
    claimOtpStore.delete(`${req.user.id}_${id}`);

    res.status(200).json({ success: true, message: 'Phone verified successfully. Your claim is under review.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending business claim requests (Admin)
// @route   GET /api/business/admin/claims
// @access  Private (Admin)
exports.getBusinessClaims = async (req, res, next) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const filter = { 'claimRequest.status': status };
    const claims = await Business.find(filter)
      .populate('claimRequest.requestedBy', 'name email phone')
      .select('name category address logo claimRequest documents.ownerIdProof documents.selfie')
      .sort({ 'claimRequest.requestedAt': -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Business.countDocuments(filter);

    res.status(200).json({ success: true, total, page: parseInt(page), data: claims });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or reject a business claim (Admin)
// @route   PUT /api/business/:id/claim/review
// @access  Private (Admin)
exports.reviewBusinessClaim = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { decision, rejectionReason } = req.body; // decision: 'approved' | 'rejected'

    if (!['approved', 'rejected'].includes(decision)) {
      return res.status(400).json({ success: false, message: "Decision must be 'approved' or 'rejected'." });
    }

    const business = await Business.findById(id).populate('claimRequest.requestedBy', 'name email role');
    if (!business) return res.status(404).json({ success: false, message: 'Business not found.' });
    if (!business.claimRequest || business.claimRequest.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'No pending claim found for this business.' });
    }

    const claimant = business.claimRequest.requestedBy;

    business.claimRequest.status = decision;
    business.claimRequest.reviewedBy = req.user.id;
    business.claimRequest.reviewedAt = new Date();

    if (decision === 'approved') {
      // MANDATORY: Claimant must have a business account before approval
      if (claimant.role !== 'business') {
        return res.status(400).json({
          success: false,
          message: 'This user does not have a business account. You must promote them to a Business Account before granting ownership.'
        });
      }

      // Check for corresponding BusinessOwner record
      const businessOwner = await BusinessOwner.findOne({ email: claimant.email.toLowerCase() });
      if (!businessOwner) {
        return res.status(400).json({
          success: false,
          message: 'No BusinessOwner record found for this user. Please promote them to a Business Account first.'
        });
      }

      // Assign ownership (Owner field in Business should refer to the BusinessOwner ID)
      // Note: We might need to handle ref inconsistency if Business.model.js strictly uses ref: 'User'
      business.owner = businessOwner._id;
      business.email = business.email || business.claimRequest.businessEmail;
      
      // Clear rejection reason if any
      if (business.claimRequest.rejectionReason) business.claimRequest.rejectionReason = undefined;

      // Ensure business is added to the BusinessOwner's array
      await BusinessOwner.findByIdAndUpdate(businessOwner._id, {
        $addToSet: { businesses: business._id }
      });

      // Keep User role updated for consistency, although BusinessOwner is the primary account
      await User.findByIdAndUpdate(claimant._id, {
        $set: { role: 'business' }
      });

      // Notify claimant: approved
      sendEmail({
        to: claimant.email,
        subject: `🎉 Your Business Claim Has Been Approved — ${business.name}`,
        html: `<p>Hi ${claimant.name},</p>
               <p>Congratulations! Your claim for <strong>${business.name}</strong> has been <strong style="color:green;">approved</strong>.</p>
               <p>You can now manage your business profile in the HashView app.</p>
               <p>Best regards,<br/><strong>The HashView Team</strong></p>`
      }).catch(() => { });
    } else {
      business.claimRequest.rejectionReason = rejectionReason || 'Your claim could not be verified.';

      // Notify claimant: rejected
      sendEmail({
        to: claimant.email,
        subject: `Business Claim Update — ${business.name}`,
        html: `<p>Hi ${claimant.name},</p>
               <p>Unfortunately, your claim for <strong>${business.name}</strong> has been <strong style="color:red;">rejected</strong>.</p>
               <p><strong>Reason:</strong> ${business.claimRequest.rejectionReason}</p>
               <p>If you believe this is a mistake, please contact our support team.</p>
               <p>Best regards,<br/><strong>The HashView Team</strong></p>`
      }).catch(() => { });
    }

    await business.save();

    res.status(200).json({ success: true, message: `Claim ${decision} successfully.`, business: { _id: business._id, name: business.name, claimRequest: business.claimRequest } });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────
//  VISIT COUNTER
// ─────────────────────────────────────────────────────────────

// In-memory cooldown store: key = `${userId || ip}_${businessId}`, value = timestamp
// Prevents the same client from inflating the counter on repeated rapid opens.
const visitCooldownStore = new Map();
const VISIT_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes per user per business

// @desc    Track a profile visit for a business
// @route   POST /api/business/:id/track-visit
// @access  Public (works for guests too)
exports.trackVisit = async (req, res, next) => {
  try {
    const { id: businessId } = req.params;

    // Build a dedup key — prefer userId, fall back to IP
    const clientKey = req.user?.id || req.ip || 'anon';
    const cooldownKey = `${clientKey}_${businessId}`;

    const lastVisit = visitCooldownStore.get(cooldownKey);
    const now = Date.now();

    if (lastVisit && now - lastVisit < VISIT_COOLDOWN_MS) {
      // Within cooldown window — acknowledge but don't increment
      return res.status(200).json({ success: true, throttled: true });
    }

    // Atomically increment (safe even under concurrent requests)
    const updated = await Business.findByIdAndUpdate(
      businessId,
      { $inc: { visitCount: 1 } },
      { new: true, select: 'visitCount' }
    );

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Business not found' });
    }

    // Record cooldown timestamp
    visitCooldownStore.set(cooldownKey, now);

    // Periodically clean up stale cooldown entries (every 500 visits)
    if (visitCooldownStore.size > 500) {
      for (const [key, ts] of visitCooldownStore.entries()) {
        if (now - ts > VISIT_COOLDOWN_MS) visitCooldownStore.delete(key);
      }
    }

    return res.status(200).json({ success: true, visitCount: updated.visitCount });
  } catch (error) {
    next(error);
  }
};
