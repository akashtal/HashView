const cron = require('node-cron');
const Business = require('../models/Business.model');
const Coupon = require('../models/Coupon.model');
const { syncGoogleRatingsForBusiness } = require('../controllers/externalReviews.controller');
const logger = require('./logger');

/**
 * Determine how many hours between syncs for a given business.
 *
 * Tiers:
 *   🆕 New      (< 30 days old)            → every 24 h  (daily)
 *   🔥 Active   (30 days–1 year + reviews) → every 168 h (weekly)
 *   💤 Inactive (> 1 year OR no reviews)   → every 720 h (monthly)
 */
const getSyncIntervalHours = (business) => {
  const ageDays = (Date.now() - new Date(business.createdAt || 0).getTime()) / (1000 * 60 * 60 * 24);
  const hasReviews = (business.rating?.count || 0) > 0;

  if (ageDays < 30) return 24;                    // New — sync daily
  if (ageDays <= 365 && hasReviews) return 168;   // Active — sync weekly
  return 720;                                      // Inactive / old — sync monthly
};

/**
 * Automatic Google Ratings Sync Job
 * Runs daily at 2:00 AM — but uses tiered intervals so each business is
 * only called at the frequency it actually needs.
 *
 * Tier summary:
 *   New  (< 30 days)          → daily   (24 h)
 *   Active (< 1 yr + reviews) → weekly  (168 h)
 *   Inactive / old            → monthly (720 h)
 */
const syncAllGoogleRatings = async () => {
  try {
    logger.info('🔄 Starting automatic Google ratings sync job (tiered)...');

    // Fetch businesses with createdAt + rating so we can apply tier logic
    const businesses = await Business.find({
      'externalProfiles.googleBusiness.businessName': { $exists: true, $ne: '' },
      status: { $in: ['active', 'pending'] }
    }).select('_id name createdAt rating externalProfiles');

    if (!businesses || businesses.length === 0) {
      logger.info('ℹ️  No businesses found with Google Business name configured');
      return;
    }

    logger.info(`📊 Found ${businesses.length} total businesses — applying tier filter...`);

    let dueCount = 0;
    let skippedCount = 0;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < businesses.length; i++) {
      const business = businesses[i];
      const intervalHours = getSyncIntervalHours(business);
      const lastSynced = business.externalProfiles?.googleBusiness?.lastSynced;

      // Check if this business is due for a sync based on its tier interval
      if (lastSynced) {
        const hoursSinceSync = (Date.now() - new Date(lastSynced).getTime()) / (1000 * 60 * 60);
        if (hoursSinceSync < intervalHours) {
          skippedCount++;
          const tierLabel = intervalHours === 24 ? 'daily' : intervalHours === 168 ? 'weekly' : 'monthly';
          logger.info(`⏭️  [${tierLabel}] Skipping ${business.name} — synced ${hoursSinceSync.toFixed(0)}h ago (next in ${(intervalHours - hoursSinceSync).toFixed(0)}h)`);
          continue;
        }
      }

      // Business is due — sync it
      dueCount++;
      try {
        // 1-second stagger between actual API calls to avoid rate limits
        if (dueCount > 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        // forceRefresh=true bypasses the 23h cache guard inside syncGoogleRatingsForBusiness
        // (tier logic above already did the time check — no need to double-gate)
        const result = await syncGoogleRatingsForBusiness(business._id.toString(), true, true);

        if (result.success) {
          successCount++;
          logger.info(`✅ Synced: ${business.name} (${business._id})`);
        } else {
          failCount++;
          logger.warn(`⚠️  Failed: ${business.name} — ${result.error}`);
        }
      } catch (error) {
        failCount++;
        logger.error(`❌ Error syncing: ${business.name} (${business._id})`, error);
      }
    }

    logger.info(
      `✅ Sync job complete — Due: ${dueCount} | Skipped: ${skippedCount} | ` +
      `Success: ${successCount} | Failed: ${failCount} | ` +
      `API calls saved today: ${skippedCount}`
    );
  } catch (error) {
    logger.error('❌ Error in automatic Google ratings sync job:', error);
  }
};


/**
 * Auto-expire coupons that have passed their 2-hour validity period
 * Runs every 5 minutes to check and expire coupons
 */
const expireCoupons = async () => {
  try {
    const now = new Date();
    
    // Find all active review_reward coupons that have expired
    const expiredCoupons = await Coupon.find({
      type: 'review_reward',
      status: 'active',
      validUntil: { $lt: now }
    });

    if (expiredCoupons.length === 0) {
      return;
    }

    logger.info(`🕐 Expiring ${expiredCoupons.length} coupon(s)...`);

    // Update all expired coupons
    const result = await Coupon.updateMany(
      {
        type: 'review_reward',
        status: 'active',
        validUntil: { $lt: now }
      },
      {
        $set: { status: 'expired' }
      }
    );

    logger.info(`✅ Expired ${result.modifiedCount} coupon(s)`);
  } catch (error) {
    logger.error('❌ Error in coupon expiration job:', error);
  }
};

/**
 * Initialize cron jobs
 */
const initializeSyncJobs = () => {
  // Schedule daily sync at 2:00 AM
  // Cron format: minute hour day month weekday
  // '0 2 * * *' = At 02:00 every day
  cron.schedule('0 2 * * *', syncAllGoogleRatings, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Adjust timezone as needed
  });

  logger.info('✅ Automatic Google ratings sync job scheduled (Daily at 2:00 AM)');

  // Schedule coupon expiration job every 5 minutes
  // Cron format: '*/5 * * * *' = Every 5 minutes
  cron.schedule('*/5 * * * *', expireCoupons, {
    scheduled: true,
    timezone: "Asia/Kolkata"
  });

  logger.info('✅ Automatic coupon expiration job scheduled (Every 5 minutes)');

  // Optional: Also run sync every 6 hours for more frequent updates
  // Uncomment the lines below if you want more frequent syncing:
  // cron.schedule('0 */6 * * *', syncAllGoogleRatings, {
  //   scheduled: true,
  //   timezone: "Asia/Kolkata"
  // });
  // logger.info('✅ Automatic Google ratings sync job scheduled (Every 6 hours)');
};

module.exports = {
  syncAllGoogleRatings,
  expireCoupons,
  initializeSyncJobs
};

