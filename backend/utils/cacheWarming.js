const Business = require('../models/Business.model');
const MenuItem = require('../models/MenuItem.model');
const logger = require('./logger');
const { setCache } = require('../config/redis');

/**
 * Preloads the menu data into Redis for the most active businesses.
 * This runs on server startup to ensure 0-latency QR scans for top customers.
 */
const warmMenuCache = async () => {
  try {
    // Find businesses that are approved and have ordering enabled (or just the top ones by some metric)
    const activeBusinesses = await Business.find({ status: 'approved' })
      .select('_id')
      .limit(100)
      .lean();

    let count = 0;

    for (const business of activeBusinesses) {
      const businessId = business._id.toString();
      const cacheKey = `menu:ordering:${businessId}`;

      // Replicate the logic from getOrderingMenu
      const items = await MenuItem.find({ business: businessId, status: 'active' })
        .sort({ menuCategory: 1, sortOrder: 1, name: 1 })
        .lean();

      if (items.length === 0) continue;

      const grouped = {};
      items.forEach(item => {
        const cat = item.menuCategory || 'General';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });

      const cacheData = {
        count: items.length,
        data: grouped
      };

      // Set cache for 5 minutes (300 seconds)
      await setCache(cacheKey, cacheData, 300);
      count++;
    }

    logger.info(`🔥 Cache warming complete: Pre-loaded menus for ${count} businesses`);
  } catch (error) {
    logger.error('❌ Cache warming failed:', error);
  }
};

module.exports = { warmMenuCache };
