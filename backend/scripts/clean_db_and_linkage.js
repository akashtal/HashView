require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const Business = require('../models/Business.model');

// Custom mapping for the specific Firebase OAuth users that had missing/generic names
const firebaseUserMappings = {
  'jaydave170679@gmail.com': 'Jay Dave',
  'mr.bakshi834@gmail.com': 'Funny Vines Bakshi',
  'sakshimahajan6@icloud.com': 'Sakshi Mahajan',
  'hughescw@hotmail.com': 'Hughes Cw',
  'batravardaan32@gmail.com': 'Vardaan Batra',
  'hannahkayfaulkner2003@gmail.com': 'Hannah Kay Faulkner',
  'jenisjchristian@gmail.com': 'Jenis Christian',
  // Apple private relays fallbacks
  'drqqvh9zqc@privaterelay.appleid.com': 'ss',
  'sxxjjk457q@privaterelay.appleid.com': 'ss',
  'gpc8rw75xp@privaterelay.appleid.com': 'Apple User',
  'zfp6mf8bcm@privaterelay.appleid.com': 'Apple User',
  'fx4r2k888c@privaterelay.appleid.com': 'Apple User',
  'r4rxf256yf@privaterelay.appleid.com': 'Apple User',
  '7s7f55czw4@privaterelay.appleid.com': 'Apple User'
};

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  console.log('Connecting to database...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  // ==========================================
  // 1. UPDATE OWNED AND UNOWNED BUSINESSES
  // ==========================================
  console.log('\n--- Updating Business Linkages & Info ---');
  
  const businesses = await Business.find({});
  console.log(`Found ${businesses.length} total businesses in database.`);

  let updatedOwnedCount = 0;
  let cleanedUnownedCount = 0;

  for (const biz of businesses) {
    // Check if the business has a valid owner
    if (biz.owner && mongoose.Types.ObjectId.isValid(biz.owner)) {
      const ownerDoc = await BusinessOwner.findById(biz.owner);
      if (ownerDoc) {
        // Business is owned. Update denormalized fields.
        let isChanged = false;
        
        if (biz.ownerName !== ownerDoc.name) {
          biz.ownerName = ownerDoc.name;
          isChanged = true;
        }
        
        // Only update if email is currently missing, empty, or set to literal "undefined"/"null"
        if (!biz.email || biz.email === 'undefined' || biz.email === 'null' || biz.email !== ownerDoc.email) {
          biz.email = ownerDoc.email || '';
          isChanged = true;
        }

        const expectedPhone = ownerDoc.phone || '';
        if (biz.phone === 'undefined' || biz.phone === 'null' || biz.phone !== expectedPhone) {
          biz.phone = expectedPhone;
          isChanged = true;
        }

        if (isChanged) {
          await biz.save();
          updatedOwnedCount++;
          console.log(`  🟢 Updated owned business: "${biz.name}" -> ownerName="${biz.ownerName}", email="${biz.email}", phone="${biz.phone}"`);
        }
      } else {
        // Owner ID exists but is not found in BusinessOwner collection (orphaned)
        console.log(`  ⚠️  Business "${biz.name}" has orphaned owner ID: ${biz.owner}. Setting owner to null.`);
        biz.owner = null;
        biz.ownerName = null;
        biz.email = null;
        biz.phone = null;
        await biz.save();
        cleanedUnownedCount++;
      }
    } else {
      // Unowned business. Clean up "undefined" or "null" literal strings
      let isChanged = false;

      if (biz.ownerName === 'undefined' || biz.ownerName === 'null') {
        biz.ownerName = null;
        isChanged = true;
      }
      if (biz.email === 'undefined' || biz.email === 'null') {
        biz.email = null;
        isChanged = true;
      }
      if (biz.phone === 'undefined' || biz.phone === 'null') {
        biz.phone = null;
        isChanged = true;
      }
      
      // Explicitly ensure owner is null or undefined if invalid
      if (biz.owner) {
        biz.owner = null;
        isChanged = true;
      }

      if (isChanged) {
        await biz.save();
        cleanedUnownedCount++;
      }
    }
  }

  console.log(`✅ Business update complete: ${updatedOwnedCount} owned updated, ${cleanedUnownedCount} unowned/orphaned cleaned.`);

  // ==========================================
  // 2. FIX GENERIC USER NAMES IN USER COLLECTION
  // ==========================================
  console.log('\n--- Fixing Generic User Names ---');

  const genericUsers = await User.find({ $or: [{ name: 'User' }, { name: /user/i }] });
  console.log(`Found ${genericUsers.length} generic users in the database to restore/clean.`);

  let updatedUsersCount = 0;

  for (const user of genericUsers) {
    const email = (user.email || '').toLowerCase();
    
    // Check if the email exists in our custom mapping
    if (firebaseUserMappings[email]) {
      const realName = firebaseUserMappings[email];
      user.name = realName;
      await user.save();
      updatedUsersCount++;
      console.log(`  🟢 Restored name for OAuth user: "${realName}" (${email})`);
    } 
    // Check if the user is a local customer user with suffix placeholder like 'user.[suffix]@hashview.com'
    else if (email.startsWith('user.') && email.endsWith('@hashview.com')) {
      // Extract the suffix
      const suffixMatch = email.match(/^user\.([a-f0-9]+)@hashview\.com$/);
      if (suffixMatch && suffixMatch[1]) {
        const suffix = suffixMatch[1].toUpperCase();
        const placeholderName = `Customer ${suffix}`;
        user.name = placeholderName;
        await user.save();
        updatedUsersCount++;
        console.log(`  🟢 Restored name for customer user: "${placeholderName}" (${email})`);
      } else {
        // Fallback placeholder
        user.name = 'Customer';
        await user.save();
        updatedUsersCount++;
        console.log(`  🟡 Set name to Customer for: (${email})`);
      }
    } else {
      // General fallback based on email prefix capitalization
      const prefix = email.split('@')[0];
      // Clean prefix from numbers/dots/symbols
      const cleanPrefix = prefix.replace(/[^a-zA-Z]/g, ' ');
      // Capitalize first letters of words
      const capitalized = cleanPrefix
        .split(' ')
        .filter(w => w.length > 0)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      const formattedName = capitalized || 'Customer';
      user.name = formattedName;
      await user.save();
      updatedUsersCount++;
      console.log(`  🟡 Capitalized email prefix to name for: "${formattedName}" (${email})`);
    }
  }

  console.log(`✅ Generic User name restoration complete: ${updatedUsersCount} users updated.`);

  await mongoose.disconnect();
  console.log('✅ Done! Disconnected from database.');
})().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
