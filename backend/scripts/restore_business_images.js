/**
 * Database Business Image Restoration Script for HashView
 * Maps fetched Cloudinary resource URLs and public IDs back to MongoDB Atlas businesses.
 * 
 * Run using: node scripts/restore_business_images.js
 */

require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Business = require('../models/Business.model');

// Helper to generate kebab-case slug of a business name
function generateSlug(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents/diacritics (like ô -> o)
    .replace(/[^a-z0-9\s-]/g, '') // remove special characters except spaces and hyphens
    .trim()
    .replace(/[\s_]+/g, '-') // replace spaces and underscores with hyphens
    .replace(/-+/g, '-'); // replace multiple hyphens with a single hyphen
}

// Custom manual overrides for edge-case business names matching Cloudinary folders
const manualOverrides = {
  // Bryn-Y-Môr Hotel had ô removed and o omitted in Cloudinary folder
  'bryn-y-mor-hotel': 'bryn-y-mr-hotel',
  // Beachside Guest House was truncated due to length limit
  'beachside-guest-house-book-on-our-website-for-discounted-rates': 'beachside-guest-house-book-on-our-website-for-disc',
  // Wok ‘n’ Roll Thai Noodle Bar slug
  'wok-n-roll-thai-noodle-bar': 'wok-n-roll-thai-noodle-bar'
};

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  const cloudinaryJsonPath = 'C:\\Users\\akash\\.gemini\\antigravity-ide\\brain\\30b4837a-32e9-4fed-84dc-98d69bd6f1ce\\scratch\\cloudinary_resources.json';
  if (!fs.existsSync(cloudinaryJsonPath)) {
    console.error(`❌ Cloudinary resources JSON not found at: ${cloudinaryJsonPath}`);
    process.exit(1);
  }

  const rawMappings = fs.readFileSync(cloudinaryJsonPath, 'utf8');
  const cloudinaryMappings = JSON.parse(rawMappings);
  console.log(`📋 Loaded Cloudinary mappings for ${Object.keys(cloudinaryMappings).length} business folder keys.`);

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  const businesses = await Business.find({});
  console.log(`📋 Found ${businesses.length} businesses in the database.`);

  let matchedCount = 0;
  let updatedCount = 0;

  for (const biz of businesses) {
    const bizId = biz._id.toString();
    const slugName = generateSlug(biz.name);
    
    // Determine the match key in Cloudinary mappings
    let matchKey = null;

    // 1. Direct business ID match
    if (cloudinaryMappings[bizId]) {
      matchKey = bizId;
      console.log(`🔍 Direct ID match found for "${biz.name}" (${bizId})`);
    } else {
      // 2. Kebab-case slug match
      if (cloudinaryMappings[slugName]) {
        matchKey = slugName;
      } else if (manualOverrides[slugName] && cloudinaryMappings[manualOverrides[slugName]]) {
        // 3. Manual overrides match
        matchKey = manualOverrides[slugName];
      } else {
        // 4. Try prefix match on keys (for truncated folder names)
        for (const key of Object.keys(cloudinaryMappings)) {
          if (slugName.startsWith(key) && key.length > 5) {
            matchKey = key;
            break;
          }
        }
      }

      if (matchKey) {
        console.log(`🔍 Name/Slug match found for "${biz.name}": DB slug "${slugName}" ➔ Cloudinary folder "${matchKey}"`);
      }
    }

    if (matchKey) {
      matchedCount++;
      const assets = cloudinaryMappings[matchKey];

      // Prepare updates
      const updateData = {};

      // Match Logo (use first logo found)
      if (assets.logos && assets.logos.length > 0) {
        updateData.logo = {
          url: assets.logos[0].url,
          publicId: assets.logos[0].publicId
        };
        console.log(`   - Logo: ${assets.logos[0].url}`);
      }

      // Match Cover Image (use first cover found)
      if (assets.covers && assets.covers.length > 0) {
        updateData.coverImage = {
          url: assets.covers[0].url,
          publicId: assets.covers[0].publicId
        };
        console.log(`   - Cover: ${assets.covers[0].url}`);
      }

      // Match Gallery (use all gallery images found)
      if (assets.gallery && assets.gallery.length > 0) {
        updateData.images = assets.gallery.map(img => ({
          url: img.url,
          publicId: img.publicId
        }));
        console.log(`   - Gallery: ${assets.gallery.length} image(s)`);
      }

      if (Object.keys(updateData).length > 0) {
        await Business.findByIdAndUpdate(biz._id, updateData);
        updatedCount++;
      }
    } else {
      console.log(`⚠️  No image assets found in Cloudinary for "${biz.name}" (slug: "${slugName}")`);
    }
  }

  console.log(`\n========================================`);
  console.log(`🏁 Restoration Summary:`);
  console.log(` - Total businesses in DB: ${businesses.length}`);
  console.log(` - Matched with Cloudinary folders: ${matchedCount}`);
  console.log(` - Updated in MongoDB: ${updatedCount}`);
  console.log(`========================================`);

  await mongoose.disconnect();
  console.log('✅ Done! Disconnected from database.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Business image restoration failed:', err);
  process.exit(1);
});
