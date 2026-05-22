/**
 * Database Restoration Script for HashView
 * Seeds the deleted businesses back into MongoDB Atlas and reconstructs owner links.
 * 
 * Run using: node scripts/restore_businesses.js
 */

require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const mongoose = require('mongoose');

const Business = require('../models/Business.model');
const Category = require('../models/Category.model');
const BusinessOwner = require('../models/BusinessOwner.model');

// Owner-to-Business mappings
const ownerToBusinessMap = {
  // Chaulay Saensri -> Thaitastic
  '692741de293b5919a61e9900': '6927430d293b5919a61e990d',
  // Akash Talukdar -> The Resident Covent Garden
  '6929f1d92c453fd7af5d13cc': '692aa3632244b386cd8409f1',
  // Theresa Curbishly -> Chatsworth House Hotel
  '696a149af0bede9d4f9e0eaa': '696a284ff0bede9d4f9e0ed4',
  // Theresa curbishly -> New Loretta Hotel
  '696f99f01b55fa092693b4ae': '696f9ed21b55fa092693b4be',
  // ShauWn -> Blue Elephant
  '69710c321b55fa092693b7e8': '69710ee81b55fa092693b7f6',
  // Theresa Curbishly -> The Baytree
  '699dc85ec51f52ae56002ab9': '699dc8f1c51f52ae56002ac0',
  // Chris Roberts -> The waterside inn
  '69d17b5a53133c9316f1faa4': '69d1855553133c9316f1fac8'
};

// Create a reverse mapping for easy owner lookup by business ID
const businessToOwnerMap = {};
for (const [ownerId, bizId] of Object.entries(ownerToBusinessMap)) {
  businessToOwnerMap[bizId] = ownerId;
}

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  // 1. Fetch available Category slugs to dynamically map category values
  const categories = await Category.find({});
  const categorySlugs = categories.map(c => c.slug);
  console.log(`📋 Found ${categorySlugs.length} category slugs in DB:`, categorySlugs);

  // Helper to dynamically choose correct category slug
  const getCategorySlug = (name) => {
    const lowerName = name.toLowerCase();
    
    // Check for Hotel
    if (
      lowerName.includes('hotel') || 
      lowerName.includes('guest house') || 
      lowerName.includes('holiday flats') || 
      lowerName.includes('abode') || 
      lowerName.includes('resident') || 
      lowerName.includes('accommodation') ||
      lowerName.includes('stay')
    ) {
      const hotelSlug = categorySlugs.find(s => s.includes('hotel'));
      if (hotelSlug) return hotelSlug;
    }

    // Check for Cafe
    if (
      lowerName.includes('cafe') || 
      lowerName.includes('café') || 
      lowerName.includes('tea room') || 
      lowerName.includes('kava') || 
      lowerName.includes('lounge') || 
      lowerName.includes('coffee') || 
      lowerName.includes('wine bar') || 
      lowerName.includes('pip & oat') || 
      lowerName.includes('providero') ||
      lowerName.includes('indulgence')
    ) {
      const cafeSlug = categorySlugs.find(s => s.includes('caf')); // matches 'caf' or 'cafe'
      if (cafeSlug) return cafeSlug;
    }

    // Check for Take Away / Fast Food / Pizza
    if (
      lowerName.includes('take away') || 
      lowerName.includes('takeaway') || 
      lowerName.includes('kebab') || 
      lowerName.includes('pizzeria') || 
      lowerName.includes('pizza') || 
      lowerName.includes('subway') || 
      lowerName.includes('kfc') || 
      lowerName.includes('wok') || 
      lowerName.includes('big mouth grill') || 
      lowerName.includes('fish tram chips')
    ) {
      const takeAwaySlug = categorySlugs.find(s => s.includes('take') || s.includes('away') || s.includes('fast'));
      if (takeAwaySlug) return takeAwaySlug;
    }

    // Default to restaurant
    const restSlug = categorySlugs.find(s => s.includes('rest'));
    return restSlug || 'restaurant';
  };

  // 2. Load and parse businesses from parsed_businesses.json
  const scratchPath = 'C:\\Users\\akash\\.gemini\\antigravity-ide\\brain\\30b4837a-32e9-4fed-84dc-98d69bd6f1ce\\scratch\\parsed_businesses.json';
  if (!fs.existsSync(scratchPath)) {
    console.error(`❌ Parsed businesses JSON not found at: ${scratchPath}`);
    process.exit(1);
  }

  const fileData = fs.readFileSync(scratchPath, 'utf8');
  let parsedBusinesses = JSON.parse(fileData);
  console.log(`📋 Loaded ${parsedBusinesses.length} businesses from JSON`);

  // Ensure unique list by ID
  const uniqueBusinessesMap = new Map();
  for (const b of parsedBusinesses) {
    uniqueBusinessesMap.set(b.id, b);
  }

  // 3. Add the 3 missing legacy/referenced businesses
  const missingBusinesses = [
    {
      id: '69189ffafc7acf915d738402',
      name: 'Cafe Indulgence',
      status: 'active',
      coordinates: [-3.8267678, 53.3232784]
    },
    {
      id: '692aa3632244b386cd8409f1',
      name: 'The Resident Covent Garden',
      status: 'active',
      coordinates: [-0.1225, 51.5117]
    },
    {
      id: '6912f3326c46b98f358733da',
      name: 'New Zealand Restaurant',
      status: 'active',
      coordinates: [-3.8267678, 53.3232784]
    }
  ];

  for (const b of missingBusinesses) {
    if (!uniqueBusinessesMap.has(b.id)) {
      uniqueBusinessesMap.set(b.id, b);
      console.log(`➕ Added missing referenced business: "${b.name}" (${b.id})`);
    }
  }

  const finalBusinessesList = Array.from(uniqueBusinessesMap.values());
  console.log(`📋 Total unique businesses to restore: ${finalBusinessesList.length}`);

  let insertedCount = 0;
  let updatedCount = 0;

  for (const b of finalBusinessesList) {
    const ownerId = businessToOwnerMap[b.id];
    let ownerObjId = null;
    let ownerName = '';

    if (ownerId) {
      const owner = await BusinessOwner.findById(ownerId);
      if (owner) {
        ownerObjId = owner._id;
        ownerName = owner.name;
      }
    }

    const category = getCategorySlug(b.name);

    // Build default Address details
    const isCoventGarden = b.id === '692aa3632244b386cd8409f1';
    const address = isCoventGarden 
      ? {
          buildingNumber: '',
          street: 'Covent Garden',
          city: 'London',
          country: 'United Kingdom',
          fullAddress: 'Covent Garden, London, United Kingdom'
        }
      : {
          buildingNumber: '',
          street: 'Mostyn Street',
          city: 'Llandudno',
          country: 'United Kingdom',
          fullAddress: 'Mostyn Street, Llandudno, United Kingdom'
        };

    const businessData = {
      _id: new mongoose.Types.ObjectId(b.id),
      name: b.name,
      status: b.status || 'active',
      category: category,
      kycStatus: 'approved',
      adminVerification: {
        status: 'approved',
        notes: 'Restored from history backup'
      },
      location: {
        type: 'Point',
        coordinates: b.coordinates // [longitude, latitude]
      },
      address: address,
      radius: 50,
      visitCount: 0
    };

    if (ownerObjId) {
      businessData.owner = ownerObjId;
      businessData.ownerName = ownerName;
    }

    // Insert or update
    const existing = await Business.findById(b.id);
    if (existing) {
      await Business.findByIdAndUpdate(b.id, businessData);
      updatedCount++;
    } else {
      await Business.create(businessData);
      insertedCount++;
    }
  }

  console.log(`✅ Successfully restored businesses: ${insertedCount} created, ${updatedCount} updated.`);

  // 4. Update the businesses array inside each owner document to link back to their restored businesses
  console.log('Linking businesses to business owners...');
  const owners = await BusinessOwner.find({});
  let ownerUpdates = 0;
  for (const owner of owners) {
    const ownedBusinesses = await Business.find({ owner: owner._id });
    const bizIds = ownedBusinesses.map(b => b._id);
    
    owner.businesses = bizIds;
    await owner.save();
    ownerUpdates++;
    console.log(` - Linked ${bizIds.length} businesses to Owner: "${owner.name}" (${owner.email})`);
  }

  console.log(`✅ Updated ${ownerUpdates} Business Owners successfully.`);

  await mongoose.disconnect();
  console.log('✅ Done! Disconnected from database.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Database restoration failed:', err);
  process.exit(1);
});
