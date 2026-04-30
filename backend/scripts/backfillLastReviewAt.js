/**
 * One-time migration: backfill lastReviewAt for all businesses
 * that already have reviews in the database.
 *
 * Run once:  node scripts/backfillLastReviewAt.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Business = require('../models/Business.model');
const Review   = require('../models/Review.model');

(async () => {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  // Get the most-recent review date per business in one aggregation
  const latest = await Review.aggregate([
    { $match: { status: 'approved' } },
    { $sort:  { createdAt: -1 } },
    { $group: { _id: '$business', lastReviewAt: { $first: '$createdAt' } } }
  ]);

  console.log(`📋 Found ${latest.length} businesses with reviews`);

  let updated = 0;
  for (const { _id, lastReviewAt } of latest) {
    await Business.findByIdAndUpdate(_id, { lastReviewAt });
    updated++;
  }

  console.log(`✅ Backfilled lastReviewAt for ${updated} businesses`);
  await mongoose.disconnect();
  process.exit(0);
})().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
