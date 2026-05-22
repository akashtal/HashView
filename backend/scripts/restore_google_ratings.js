require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const axios = require('axios');
const Business = require('../models/Business.model');
const { syncGoogleRatingsForBusiness } = require('../controllers/externalReviews.controller');

async function main() {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!dbUri) {
    console.error('❌ Error: MONGODB_URI or MONGO_URI not found in environment');
    process.exit(1);
  }

  if (!apiKey) {
    console.error('❌ Error: GOOGLE_PLACES_API_KEY not found in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  console.log('\nFetching active and pending businesses...');
  const businesses = await Business.find({ status: { $in: ['active', 'pending'] } });
  console.log(`📋 Found ${businesses.length} businesses to process.`);

  let resolvedCount = 0;
  let syncSuccessCount = 0;
  let syncFailCount = 0;

  for (let i = 0; i < businesses.length; i++) {
    const business = businesses[i];
    console.log(`\n----------------------------------------`);
    console.log(`Processing [${i + 1}/${businesses.length}]: ${business.name} (${business._id})`);

    let placeId = business.externalProfiles?.googleBusiness?.placeId;
    let googleBusinessName = business.externalProfiles?.googleBusiness?.businessName;

    // Step 1: Resolve Place ID if not present
    if (!placeId) {
      const query = `${business.name} ${business.address?.fullAddress || ''}`.trim();
      console.log(`🔍 Resolving Place ID for query: "${query}"`);

      try {
        // Stagger API calls to prevent rapid firing
        await new Promise(r => setTimeout(r, 600));

        const response = await axios.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', {
          params: {
            input: query,
            inputtype: 'textquery',
            fields: 'place_id,name,formatted_address',
            key: apiKey
          }
        });

        if (response.data.status === 'OK' && response.data.candidates && response.data.candidates.length > 0) {
          const candidate = response.data.candidates[0];
          placeId = candidate.place_id;
          googleBusinessName = candidate.name;
          console.log(`✅ Google Match found:`);
          console.log(`   - Place ID: ${placeId}`);
          console.log(`   - Business Name: ${googleBusinessName}`);
          console.log(`   - Address: ${candidate.formatted_address}`);

          // Save Google profile basics to the business document first
          if (!business.externalProfiles) {
            business.externalProfiles = {};
          }
          business.externalProfiles.googleBusiness = {
            businessName: googleBusinessName,
            placeId: placeId,
            rating: 0,
            reviewCount: 0,
            lastSynced: new Date(0)
          };
          await business.save();
          resolvedCount++;
        } else {
          console.log(`⚠️ No Google Place match found. Status: ${response.data.status}`);
        }
      } catch (err) {
        console.error(`❌ Error resolving Place ID:`, err.message);
      }
    } else {
      console.log(`ℹ️ Business already has Place ID: ${placeId}`);
    }

    // Step 2: Trigger sync for Google Ratings and Reviews
    if (placeId) {
      console.log(`🔄 Syncing Google ratings and reviews for "${business.name}"...`);
      try {
        // Wait 600ms to throttle details requests
        await new Promise(r => setTimeout(r, 600));

        // Call helper: syncGoogleRatingsForBusiness(businessId, ratingsOnly, forceRefresh)
        // Set ratingsOnly = false so it imports review comments, forceRefresh = true to ignore cache
        const result = await syncGoogleRatingsForBusiness(business._id.toString(), false, true);

        if (result.success) {
          console.log(`✅ Successfully synced ratings & reviews for "${business.name}"`);
          console.log(`   - Rating: ${result.data?.rating || 'N/A'}`);
          console.log(`   - Review Count: ${result.data?.reviewCount || 0}`);
          console.log(`   - Fetched Reviews: ${result.data?.reviews?.length || 0}`);
          syncSuccessCount++;
        } else {
          console.warn(`⚠️ Sync failed: ${result.error}`);
          syncFailCount++;
        }
      } catch (syncErr) {
        console.error(`❌ Exception during sync:`, syncErr.message);
        syncFailCount++;
      }
    } else {
      console.log(`⏭️ Skipping sync because no Place ID was resolved.`);
    }
  }

  console.log(`\n========================================`);
  console.log(`Google Ratings Restore Summary:`);
  console.log(` - Total businesses: ${businesses.length}`);
  console.log(` - Resolved Place IDs: ${resolvedCount}`);
  console.log(` - Sync Succeeded: ${syncSuccessCount}/${businesses.length}`);
  console.log(` - Sync Failed: ${syncFailCount}`);
  console.log(`========================================`);

  await mongoose.disconnect();
  console.log('\n✅ Done.');
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
