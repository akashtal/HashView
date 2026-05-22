require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Business = require('../models/Business.model');

// Helper to find TripAdvisor rating, review count, and url under different possible property names
function extractTripAdvisorData(item) {
  // Extract rating (usually a float from 0 to 5)
  let rating = 0;
  const ratingKeys = ['rating', 'overallRating', 'stars', 'score', 'bubbleRating'];
  for (const key of ratingKeys) {
    if (item[key] !== undefined && item[key] !== null) {
      rating = parseFloat(item[key]);
      // Some scrapers output rating scaled (e.g. 45 or 50 instead of 4.5 or 5.0)
      if (rating > 5) rating = rating / 10;
      break;
    }
  }

  // Extract review count
  let reviewCount = 0;
  const countKeys = ['reviewsCount', 'reviewCount', 'numberOfReviews', 'reviews', 'count'];
  for (const key of countKeys) {
    if (item[key] !== undefined && item[key] !== null) {
      reviewCount = parseInt(item[key]);
      break;
    }
  }

  // Extract URL
  let url = '';
  const urlKeys = ['url', 'webUrl', 'link', 'tripadvisorUrl'];
  for (const key of urlKeys) {
    if (item[key] !== undefined && item[key] !== null && typeof item[key] === 'string') {
      url = item[key];
      break;
    }
  }

  // Extract query / search term used
  let searchQuery = '';
  const queryKeys = ['searchQuery', 'query', 'keyword', 'searchTerm'];
  for (const key of queryKeys) {
    if (item[key] !== undefined && item[key] !== null && typeof item[key] === 'string') {
      searchQuery = item[key];
      break;
    }
  }

  return { rating, reviewCount, url, searchQuery };
}

async function main() {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    console.error('❌ Error: MONGODB_URI or MONGO_URI not found in environment');
    process.exit(1);
  }

  // Input file path
  const resultsFilename = process.argv[2] || 'tripadvisor_results.json';
  const resultsPath = path.isAbsolute(resultsFilename) 
    ? resultsFilename 
    : path.join(__dirname, '..', resultsFilename);

  if (!fs.existsSync(resultsPath)) {
    console.error(`❌ Error: Scraped results file not found at: ${resultsPath}`);
    console.log('\n💡 Instructions:');
    console.log('  1. Download your TripAdvisor Scraper results from Apify as a JSON file.');
    console.log('  2. Place it in your backend directory named "tripadvisor_results.json" (or pass the path to this script).');
    console.log('  3. Run this script: node scripts/import_tripadvisor_ratings.js [filename.json]');
    process.exit(1);
  }

  // Mappings file path
  const mappingsPath = path.join(__dirname, '../apify_business_mappings.json');
  if (!fs.existsSync(mappingsPath)) {
    console.error(`❌ Error: Mappings file not found at ${mappingsPath}. Please run export_businesses_for_apify.js first.`);
    process.exit(1);
  }

  console.log('Loading mappings and results...');
  const mappings = JSON.parse(fs.readFileSync(mappingsPath, 'utf8'));
  const rawResults = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

  console.log(`📋 Loaded ${mappings.length} database mappings.`);
  console.log(`📋 Loaded ${rawResults.length} scraped results from Apify.`);

  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  let successCount = 0;
  let skippedCount = 0;

  for (const item of rawResults) {
    const data = extractTripAdvisorData(item);
    
    // Find matching business in our mappings
    let matchedMapping = null;

    if (data.searchQuery) {
      matchedMapping = mappings.find(m => m.searchTerm.toLowerCase().trim() === data.searchQuery.toLowerCase().trim());
    }

    // Fallback: match by business name
    if (!matchedMapping && item.name) {
      matchedMapping = mappings.find(m => m.name.toLowerCase().trim() === item.name.toLowerCase().trim());
    }

    if (!matchedMapping) {
      console.log(`⚠️  Could not find database match for result: "${item.name || 'Unnamed'}" (${data.searchQuery || 'No search query'})`);
      skippedCount++;
      continue;
    }

    try {
      const business = await Business.findById(matchedMapping.id);
      if (!business) {
        console.warn(`⚠️  Business document not found in DB for ID: ${matchedMapping.id}`);
        skippedCount++;
        continue;
      }

      if (!business.externalProfiles) {
        business.externalProfiles = {};
      }
      if (!business.externalProfiles.tripAdvisor) {
        business.externalProfiles.tripAdvisor = {};
      }

      // Update the rating, reviewCount, and profileUrl
      business.externalProfiles.tripAdvisor.rating = data.rating;
      business.externalProfiles.tripAdvisor.reviewCount = data.reviewCount;
      business.externalProfiles.tripAdvisor.profileUrl = data.url;
      business.externalProfiles.tripAdvisor.lastSynced = new Date();

      await business.save();
      console.log(`✅ Updated "${business.name}" ➔ Rating: ${data.rating}, Reviews: ${data.reviewCount}, URL: ${data.url}`);
      successCount++;
    } catch (err) {
      console.error(`❌ Error updating business ID ${matchedMapping.id} (${matchedMapping.name}):`, err.message);
      skippedCount++;
    }
  }

  console.log('\n========================================');
  console.log(`Import Complete:`);
  console.log(` - Successfully updated in DB: ${successCount}`);
  console.log(` - Skipped / Not matched: ${skippedCount}`);
  console.log('========================================');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
