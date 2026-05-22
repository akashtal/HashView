/**
 * Script to recalculate and update review statistics for all businesses in MongoDB.
 * Computes rating.average, rating.count, reviewCount, and lastReviewAt based on
 * the actual approved reviews in the database.
 * 
 * Run using: node scripts/recalculate_business_ratings.js
 */

require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const Business = require('../models/Business.model');
const Review = require('../models/Review.model');

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    console.error('❌ Error: MONGODB_URI or MONGO_URI not found in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  console.log('\nFetching all businesses...');
  const businesses = await Business.find({});
  console.log(`📋 Found ${businesses.length} businesses in the database.`);

  let updatedCount = 0;
  let hasReviewsCount = 0;

  for (const business of businesses) {
    const businessId = business._id;
    
    // Find all approved reviews for this business
    const reviews = await Review.find({ business: businessId, status: 'approved' });
    const reviewCountVal = reviews.length;

    let avgRating = 0;
    let newestReviewDate = null;

    if (reviewCountVal > 0) {
      hasReviewsCount++;
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      avgRating = totalRating / reviewCountVal;
      // Round to 2 decimal places
      avgRating = Math.round(avgRating * 100) / 100;

      // Find the newest review date
      const sortedReviews = reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      newestReviewDate = sortedReviews[0].createdAt;
    }

    // Check if the business needs an update (compare values)
    const currentAvg = business.rating?.average || 0;
    const currentCount = business.rating?.count || 0;
    const currentReviewCount = business.reviewCount || 0;
    const currentLastReviewAt = business.lastReviewAt ? new Date(business.lastReviewAt).getTime() : null;
    const newLastReviewAt = newestReviewDate ? new Date(newestReviewDate).getTime() : null;

    if (
      currentAvg !== avgRating ||
      currentCount !== reviewCountVal ||
      currentReviewCount !== reviewCountVal ||
      currentLastReviewAt !== newLastReviewAt
    ) {
      // Update business rating counters
      await Business.findByIdAndUpdate(businessId, {
        $set: {
          'rating.average': avgRating,
          'rating.count': reviewCountVal,
          reviewCount: reviewCountVal,
          lastReviewAt: newestReviewDate
        }
      });

      console.log(`⚡ Updated "${business.name}" (${businessId}):`);
      console.log(`   - Reviews Count: ${currentReviewCount} ➔ ${reviewCountVal}`);
      console.log(`   - Rating Average: ${currentAvg} ➔ ${avgRating}`);
      console.log(`   - Last Review At: ${business.lastReviewAt ? business.lastReviewAt.toISOString() : 'null'} ➔ ${newestReviewDate ? new Date(newestReviewDate).toISOString() : 'null'}`);
      
      updatedCount++;
    }
  }

  console.log(`\n📊 RECALCULATION SUMMARY:`);
  console.log(` - Total businesses analyzed: ${businesses.length}`);
  console.log(` - Businesses with active reviews: ${hasReviewsCount}`);
  console.log(` - Businesses updated: ${updatedCount}`);

  await mongoose.disconnect();
  console.log('\n✅ Disconnected from database.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Recalculation failed:', err);
  process.exit(1);
});
