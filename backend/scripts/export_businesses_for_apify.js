require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const Business = require('../models/Business.model');

async function main() {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!dbUri) {
    console.error('❌ Error: MONGODB_URI or MONGO_URI not found in environment');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  console.log('\nFetching active and pending businesses...');
  const businesses = await Business.find({ status: { $in: ['active', 'pending'] } });
  console.log(`📋 Found ${businesses.length} businesses to export.`);

  const searchTerms = [];
  const businessMappings = [];

  businesses.forEach(business => {
    // Generate a clean and specific query term: "Business Name, City, Postcode, Country"
    const name = business.name;
    const city = business.address?.city || '';
    const postcode = business.address?.postcode || '';
    const country = business.address?.country || 'United Kingdom';

    const parts = [name];
    if (city) parts.push(city);
    if (postcode) parts.push(postcode);
    if (country) parts.push(country);

    const term = parts.join(', ');
    searchTerms.push(term);

    // Keep map of index to business _id for the import stage later
    businessMappings.push({
      id: business._id.toString(),
      name: business.name,
      searchTerm: term
    });
  });

  // Save the plain text search terms (one per line)
  const txtPath = path.join(__dirname, '../apify_search_terms.txt');
  fs.writeFileSync(txtPath, searchTerms.join('\n'), 'utf8');
  console.log(`\n💾 Saved plain text search terms list to: ${txtPath}`);

  // Save the full mapping file to help us match results back to the database ids later
  const mappingsPath = path.join(__dirname, '../apify_business_mappings.json');
  fs.writeFileSync(mappingsPath, JSON.stringify(businessMappings, null, 2), 'utf8');
  console.log(`💾 Saved business ID mappings to: ${mappingsPath}`);

  console.log('\n========================================');
  console.log(`Export Complete:`);
  console.log(` - Total search terms: ${searchTerms.length}`);
  console.log(` - Mappings generated: ${businessMappings.length}`);
  console.log('========================================\n');
  console.log('Sample search terms generated:');
  searchTerms.slice(0, 5).forEach((t, i) => console.log(`  ${i+1}. "${t}"`));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
