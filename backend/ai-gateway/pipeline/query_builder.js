/**
 * Pipeline Layer 3: Query Builder
 *
 * Converts structured intent filters into a MongoDB aggregation pipeline.
 * This is deterministic logic — no AI involved. Pure database query construction.
 *
 * Strategy:
 *  - If location is available → use $geoNear to sort by distance first
 *  - $match filters by category, rating, dietary, city, open-now, coupons
 *  - $lookup joins MenuItem collection for menu keyword + price filtering
 *  - All joins are intentional LEFT-OUTER so businesses without menu data still appear
 */

const mongoose = require('mongoose');
const settings = require('../config/settings');

/**
 * Layer 3: Build MongoDB aggregation pipeline from intent.
 *
 * @param {Object} intent   - Normalized intent from Layer 2
 * @param {Object} location - { latitude, longitude } or null
 * @param {Object} options  - { radius, limit, page }
 * @returns {Object[]} - MongoDB aggregation pipeline stages
 */
function buildQuery(intent, location, options = {}) {
  const { radius = settings.search.defaultRadius, limit = 10, page = 1 } = options;
  const skip = (page - 1) * limit;
  const pipeline = [];

  // ─── Stage 1: Geospatial (if location provided and near_me requested) ─────────
  if (location && (intent.near_me || !intent.city)) {
    pipeline.push({
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [location.longitude, location.latitude],
        },
        distanceField: '_distance',      // metres from user
        maxDistance: radius,
        spherical: true,
        query: { status: 'active' },     // Pre-filter: only active businesses
      },
    });
  } else {
    // No geospatial: filter active businesses only
    pipeline.push({ $match: { status: 'active' } });
  }

  // ─── Stage 2: Core filters ────────────────────────────────────────────────────
  const matchFilters = {};

  // Category (case-insensitive)
  if (intent.category) {
    matchFilters.category = { $regex: new RegExp(`^${escapeRegex(intent.category)}$`, 'i') };
  }

  // Minimum rating
  if (intent.min_rating) {
    matchFilters['rating.average'] = { $gte: intent.min_rating };
  }

  // City (case-insensitive)
  if (intent.city && !intent.near_me) {
    matchFilters.$or = [
      { 'address.city': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
      { 'address.area': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
      { 'address.fullAddress': { $regex: new RegExp(escapeRegex(intent.city), 'i') } },
    ];
  }

  // Open now (check against current time and day of week)
  if (intent.is_open_now) {
    const now = new Date();
    const dayIndex = now.getDay(); // 0=Sunday
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = days[dayIndex];
    const currentHour = now.getHours() * 100 + now.getMinutes(); // e.g. 14:30 → 1430

    matchFilters[`openingHours.${currentDay}.isOpen`] = true;
    matchFilters[`openingHours.${currentDay}.open`] = { $lte: String(currentHour).padStart(4, '0') };
    matchFilters[`openingHours.${currentDay}.close`] = { $gte: String(currentHour).padStart(4, '0') };
  }

  if (Object.keys(matchFilters).length > 0) {
    pipeline.push({ $match: matchFilters });
  }

  // ─── Stage 3: Join with MenuItem (for menu keyword + price filtering) ─────────
  const hasMenuFilter = intent.menu_keyword || intent.price_max || intent.price_min || intent.dietary;

  if (hasMenuFilter) {
    // Join menu items for this business
    pipeline.push({
      $lookup: {
        from: 'menuitems',
        let: { bizId: '$_id' },
        pipeline: [
          { $match: { $expr: { $eq: ['$business', '$$bizId'] }, status: 'active' } },
          // Apply menu-level filters inside the $lookup
          ...(intent.menu_keyword ? [{
            $match: {
              $or: [
                { name: { $regex: new RegExp(escapeRegex(intent.menu_keyword), 'i') } },
                { tags: { $elemMatch: { $regex: new RegExp(escapeRegex(intent.menu_keyword), 'i') } } },
                { description: { $regex: new RegExp(escapeRegex(intent.menu_keyword), 'i') } },
              ],
            },
          }] : []),
          ...(intent.price_max ? [{ $match: { price: { $lte: intent.price_max } } }] : []),
          ...(intent.price_min ? [{ $match: { price: { $gte: intent.price_min } } }] : []),
          ...(intent.dietary ? [{
            $match: {
              dietary: { $in: intent.dietary },
            },
          }] : []),
          { $limit: 5 }, // Only need a few items per business
        ],
        as: '_menuItems',
      },
    });

    // For strict menu filtering (keyword/price): only keep businesses that have matching items
    if (intent.menu_keyword || intent.price_max || intent.price_min) {
      pipeline.push({ $match: { '_menuItems.0': { $exists: true } } });
    }
  }

  // ─── Stage 4: Join Coupons (if deals requested) ───────────────────────────────
  if (intent.has_coupons) {
    pipeline.push({
      $lookup: {
        from: 'coupons',
        let: { bizId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$business', '$$bizId'] },
              status: 'active',
              expiresAt: { $gt: new Date() },
            },
          },
          { $limit: 3 },
        ],
        as: '_coupons',
      },
    });

    // Only keep businesses with active coupons
    pipeline.push({ $match: { '_coupons.0': { $exists: true } } });
  }

  // ─── Stage 5: Count total results (before pagination) ────────────────────────
  // We use $facet to get both count and paginated results in one query
  pipeline.push({
    $facet: {
      total: [{ $count: 'count' }],
      results: [
        { $skip: skip },
        { $limit: limit },
        // Project only needed fields (avoid sending huge documents to the pipeline)
        {
          $project: {
            _id: 1,
            name: 1,
            category: 1,
            description: 1,
            status: 1,
            address: 1,
            location: 1,
            rating: 1,
            logo: 1,
            coverImage: 1,
            images: { $slice: ['$images', 3] },
            openingHours: 1,
            externalProfiles: 1,
            isVerified: 1,
            isActive: 1,
            visitCount: 1,
            reviewCount: 1,
            lastReviewAt: 1,
            _distance: 1,
            _menuItems: 1,
            _coupons: 1,
            createdAt: 1,
          },
        },
      ],
    },
  });

  return pipeline;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { buildQuery };
