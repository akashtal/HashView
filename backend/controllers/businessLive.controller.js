const { getTopReviewersForBusinesses } = require('../utils/businessStats');
const logger = require('../utils/logger');

// In-memory cache for top reviewers: Map<businessId_string, { user, reviewCount }>
const topReviewerCache = new Map();

// Socket.io instance
let ioInstance = null;

exports.setSocketIO = (io) => {
  ioInstance = io;
};

/**
 * @desc    Get live top reviewers for requested businesses
 * @route   POST /api/business/top-reviewers
 * @access  Public
 */
exports.getLiveTopReviewers = async (req, res, next) => {
  try {
    const { businessIds } = req.body;
    
    if (!businessIds || !Array.isArray(businessIds)) {
      return res.status(400).json({ success: false, message: 'businessIds array is required' });
    }

    const missingIds = [];
    const result = {};

    // 1. Check in-memory cache first
    businessIds.forEach(id => {
      const idStr = id.toString();
      if (topReviewerCache.has(idStr)) {
        result[idStr] = topReviewerCache.get(idStr);
      } else {
        missingIds.push(idStr);
      }
    });

    // 2. Fetch missing IDs from DB and cache them
    if (missingIds.length > 0) {
      const dbResult = await getTopReviewersForBusinesses(missingIds);
      
      missingIds.forEach(id => {
        if (dbResult[id]) {
          topReviewerCache.set(id, dbResult[id]);
          result[id] = dbResult[id];
        } else {
          // Cache null to prevent repeated DB hits for businesses with 0 reviews
          topReviewerCache.set(id, null);
          result[id] = null;
        }
      });
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error fetching live top reviewers:', error);
    next(error);
  }
};

/**
 * Utility to invalidate cache and emit update via socket
 */
exports.invalidateAndEmitTopReviewer = async (businessId) => {
  if (!businessId) return;
  const idStr = businessId.toString();
  topReviewerCache.delete(idStr);
  logger.info(`Invalidated top reviewer cache for business ${idStr}`);

  // Recalculate immediately for socket clients
  try {
    const { getTopReviewersForBusinesses } = require('../utils/businessStats');
    const dbResult = await getTopReviewersForBusinesses([idStr]);
    const newData = dbResult[idStr] || null;
    topReviewerCache.set(idStr, newData);

    // Emit to all connected clients
    if (ioInstance) {
      ioInstance.emit('topReviewerUpdated', {
        businessId: idStr,
        topReviewer: newData
      });
      logger.info(`Emitted topReviewerUpdated via socket for business ${idStr}`);
    }
  } catch (error) {
    logger.error('Error recalculating top reviewer for socket emit:', error);
  }
};
