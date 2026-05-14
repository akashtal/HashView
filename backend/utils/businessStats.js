const Review = require('../models/Review.model');
const mongoose = require('mongoose');

/**
 * Aggregates the top reviewers for a given array of business IDs.
 * Used by the live mobile/frontend cache (businessLive.controller.js).
 *
 * @param {Array<String>} businessIds - Array of MongoDB ObjectIDs as strings.
 * @param {number} [limit=10] - Max reviewers to return per business.
 * @returns {Promise<Object>} Map of businessId → [{ user, reviewCount, lastReviewAt }]
 */
const getTopReviewersForBusinesses = async (businessIds, limit = 10) => {
  if (!businessIds || businessIds.length === 0) return {};

  const objectIds = businessIds.map(id => new mongoose.Types.ObjectId(id));

  const aggregation = await Review.aggregate([
    {
      $match: {
        business: { $in: objectIds },
        status: { $in: ['approved', 'active'] }
      }
    },
    {
      $group: {
        _id: { business: '$business', user: '$user' },
        reviewCount: { $sum: 1 },
        lastReviewAt: { $max: '$createdAt' }
      }
    },
    { $sort: { reviewCount: -1, lastReviewAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: '_id.user',
        foreignField: '_id',
        as: 'userData'
      }
    },
    { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: '$_id.business',
        reviewers: {
          $push: {
            user: {
              _id: '$userData._id',
              name: '$userData.name',
              profileImage: '$userData.profileImage'
            },
            reviewCount: '$reviewCount',
            lastReviewAt: '$lastReviewAt'
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        reviewers: { $slice: ['$reviewers', limit] }
      }
    }
  ]);

  const result = {};
  aggregation.forEach(item => {
    result[item._id.toString()] = item.reviewers;
  });

  return result;
};

/**
 * Full analytics aggregation for the admin Review Analytics dashboard.
 * Returns a paginated leaderboard of (business, user) pairs with review counts.
 *
 * @param {Object} filters
 * @param {string}  [filters.businessId]   - Filter to a single business
 * @param {string}  [filters.userId]        - Filter to a single user
 * @param {string}  [filters.userSearch]    - Partial name match on user (post-lookup)
 * @param {Date}    [filters.dateFrom]      - Min createdAt
 * @param {Date}    [filters.dateTo]        - Max createdAt
 * @param {number}  [filters.minReviews=1]  - Min review count threshold
 * @param {string}  [filters.sortBy]        - 'reviewCount'|'lastReviewAt'|'businessName'
 * @param {number}  [filters.page=1]
 * @param {number}  [filters.limit=50]
 * @param {number}  [filters.leaderboardLimit=10] - Max reviewers per business card
 * @returns {Promise<{ rows, total, summary }>}
 */
const getReviewAnalyticsSummary = async (filters = {}) => {
  const {
    businessId,
    userId,
    dateFrom,
    dateTo,
    minReviews = 1,
    sortBy = 'reviewCount',
    page = 1,
    limit = 50,
    leaderboardLimit = 10
  } = filters;

  // ── Build the base $match ──────────────────────────────────────────────────
  const matchStage = {
    status: { $in: ['approved', 'active'] }
  };

  if (businessId) {
    matchStage.business = new mongoose.Types.ObjectId(businessId);
  }

  if (userId) {
    matchStage.user = new mongoose.Types.ObjectId(userId);
  }

  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }

  // ── Aggregation pipeline ───────────────────────────────────────────────────
  const pipeline = [
    { $match: matchStage },

    // Group by (business × user)
    {
      $group: {
        _id: { business: '$business', user: '$user' },
        reviewCount: { $sum: 1 },
        lastReviewAt: { $max: '$createdAt' },
        firstReviewAt: { $min: '$createdAt' }
      }
    },

    // Apply minimum review count filter
    { $match: { reviewCount: { $gte: parseInt(minReviews) } } },

    // Lookup user details
    {
      $lookup: {
        from: 'users',
        localField: '_id.user',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, profileImage: 1, email: 1 } }],
        as: 'userData'
      }
    },
    { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },

    // Lookup business details
    {
      $lookup: {
        from: 'businesses',
        localField: '_id.business',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, logo: 1, category: 1 } }],
        as: 'businessData'
      }
    },
    { $unwind: { path: '$businessData', preserveNullAndEmptyArrays: true } },

    // Shape the output document
    {
      $project: {
        _id: 0,
        businessId: '$_id.business',
        businessName: { $ifNull: ['$businessData.name', 'Unknown Business'] },
        businessLogo: '$businessData.logo',
        businessCategory: '$businessData.category',
        userId: '$_id.user',
        userName: { $ifNull: ['$userData.name', 'Unknown User'] },
        userAvatar: '$userData.profileImage',
        userEmail: '$userData.email',
        reviewCount: 1,
        lastReviewAt: 1,
        firstReviewAt: 1
      }
    },

    // Sort
    ...(sortBy === 'lastReviewAt'
      ? [{ $sort: { lastReviewAt: -1, reviewCount: -1 } }]
      : sortBy === 'businessName'
        ? [{ $sort: { businessName: 1, reviewCount: -1 } }]
        : [{ $sort: { reviewCount: -1, lastReviewAt: -1 } }]),
  ];

  // Run count + paginated fetch in parallel
  const [countResult, rows] = await Promise.all([
    Review.aggregate([...pipeline, { $count: 'total' }]),
    Review.aggregate([
      ...pipeline,
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ])
  ]);

  const total = countResult[0]?.total || 0;

  // ── Summary stats (single fast aggregation) ───────────────────────────────
  const summaryMatch = { status: { $in: ['approved', 'active'] } };
  if (businessId) summaryMatch.business = new mongoose.Types.ObjectId(businessId);
  if (dateFrom || dateTo) {
    summaryMatch.createdAt = {};
    if (dateFrom) summaryMatch.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   summaryMatch.createdAt.$lte = new Date(dateTo);
  }

  const [summary] = await Review.aggregate([
    { $match: summaryMatch },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueBusinesses: { $addToSet: '$business' },
        latestReview: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 0,
        totalReviews: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueBusinessCount: { $size: '$uniqueBusinesses' },
        latestReview: 1
      }
    }
  ]);

  return {
    rows,
    total,
    pages: Math.ceil(total / limit),
    page,
    summary: summary || {
      totalReviews: 0,
      uniqueUserCount: 0,
      uniqueBusinessCount: 0,
      latestReview: null
    }
  };
};

/**
 * Get per-business leaderboard cards for the analytics grid view.
 * Returns businesses grouped with their ranked reviewer list.
 *
 * @param {Object} filters - Same filters as getReviewAnalyticsSummary
 * @returns {Promise<{ businesses: Array, summary: Object }>}
 */
const getBusinessLeaderboards = async (filters = {}) => {
  const {
    businessId,
    dateFrom,
    dateTo,
    minReviews = 1,
    sortBy = 'reviewCount',
    page = 1,
    limit = 20,
    leaderboardLimit = 10
  } = filters;

  const matchStage = {
    status: { $in: ['approved', 'active'] }
  };

  if (businessId) {
    matchStage.business = new mongoose.Types.ObjectId(businessId);
  }

  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   matchStage.createdAt.$lte = new Date(dateTo);
  }

  const pipeline = [
    { $match: matchStage },

    // Group by (business × user) to get per-user count per business
    {
      $group: {
        _id: { business: '$business', user: '$user' },
        reviewCount: { $sum: 1 },
        lastReviewAt: { $max: '$createdAt' }
      }
    },

    // Filter minimum reviews
    { $match: { reviewCount: { $gte: parseInt(minReviews) } } },

    // Lookup reviewer details
    {
      $lookup: {
        from: 'users',
        localField: '_id.user',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, profileImage: 1 } }],
        as: 'userData'
      }
    },
    { $unwind: { path: '$userData', preserveNullAndEmptyArrays: true } },

    // Group by business, collecting ranked reviewer list
    {
      $group: {
        _id: '$_id.business',
        totalReviews: { $sum: '$reviewCount' },
        uniqueReviewers: { $sum: 1 },
        lastActivityAt: { $max: '$lastReviewAt' },
        reviewers: {
          $push: {
            userId: '$_id.user',
            name: { $ifNull: ['$userData.name', 'Unknown'] },
            avatar: '$userData.profileImage',
            reviewCount: '$reviewCount',
            lastReviewAt: '$lastReviewAt'
          }
        }
      }
    },

    // Lookup business info
    {
      $lookup: {
        from: 'businesses',
        localField: '_id',
        foreignField: '_id',
        pipeline: [{ $project: { name: 1, logo: 1, category: 1 } }],
        as: 'businessData'
      }
    },
    { $unwind: { path: '$businessData', preserveNullAndEmptyArrays: true } },

    // Shape final output
    {
      $project: {
        _id: 0,
        businessId: '$_id',
        businessName: { $ifNull: ['$businessData.name', 'Unknown Business'] },
        businessLogo: '$businessData.logo',
        businessCategory: '$businessData.category',
        totalReviews: 1,
        uniqueReviewers: 1,
        lastActivityAt: 1,
        // Sort the reviewers array within each business card
        reviewers: {
          $slice: [
            {
              $sortArray: {
                input: '$reviewers',
                sortBy: { reviewCount: -1, lastReviewAt: -1 }
              }
            },
            leaderboardLimit
          ]
        }
      }
    },

    // Sort business cards
    ...(sortBy === 'lastActivity'
      ? [{ $sort: { lastActivityAt: -1 } }]
      : sortBy === 'businessName'
        ? [{ $sort: { businessName: 1 } }]
        : [{ $sort: { totalReviews: -1, lastActivityAt: -1 } }]),
  ];

  // Count unique businesses for pagination
  const [countResult, businesses] = await Promise.all([
    Review.aggregate([...pipeline, { $count: 'total' }]),
    Review.aggregate([
      ...pipeline,
      { $skip: (page - 1) * limit },
      { $limit: limit }
    ])
  ]);

  const total = countResult[0]?.total || 0;

  // Global summary stats
  const summaryMatch = { status: { $in: ['approved', 'active'] } };
  if (businessId) summaryMatch.business = new mongoose.Types.ObjectId(businessId);
  if (dateFrom || dateTo) {
    summaryMatch.createdAt = {};
    if (dateFrom) summaryMatch.createdAt.$gte = new Date(dateFrom);
    if (dateTo)   summaryMatch.createdAt.$lte = new Date(dateTo);
  }

  const [summary] = await Review.aggregate([
    { $match: summaryMatch },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        uniqueUsers: { $addToSet: '$user' },
        uniqueBusinesses: { $addToSet: '$business' },
        latestReview: { $max: '$createdAt' }
      }
    },
    {
      $project: {
        _id: 0,
        totalReviews: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueBusinessCount: { $size: '$uniqueBusinesses' },
        latestReview: 1
      }
    }
  ]);

  return {
    businesses,
    total,
    pages: Math.ceil(total / limit),
    page,
    summary: summary || {
      totalReviews: 0,
      uniqueUserCount: 0,
      uniqueBusinessCount: 0,
      latestReview: null
    }
  };
};

module.exports = {
  getTopReviewersForBusinesses,
  getReviewAnalyticsSummary,
  getBusinessLeaderboards
};
