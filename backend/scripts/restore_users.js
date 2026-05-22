/**
 * Database Users Restoration Script for HashView
 * Seeds wiped customer users back into MongoDB Atlas from Firebase and local mappings.
 * 
 * Run using: node scripts/restore_users.js
 */

require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const mongoose = require('mongoose');

const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');

// Load configurations and dump files
const firebaseDumpPath = 'C:\\Users\\akash\\.gemini\\antigravity-ide\\brain\\30b4837a-32e9-4fed-84dc-98d69bd6f1ce\\scratch\\firebase_users_dump.json';
const usersToRestorePath = 'C:\\Users\\akash\\.gemini\\antigravity-ide\\brain\\30b4837a-32e9-4fed-84dc-98d69bd6f1ce\\scratch\\users_to_restore.json';

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://hashview2025:hashview@ac-ztcihbp-shard-00-00.fvr6ve4.mongodb.net:27017,ac-ztcihbp-shard-00-01.fvr6ve4.mongodb.net:27017,ac-ztcihbp-shard-00-02.fvr6ve4.mongodb.net:27017/hashview?ssl=true&replicaSet=atlas-79967p-shard-0&authSource=admin&retryWrites=true&w=majority';
  
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  // Load Firebase users
  if (!fs.existsSync(firebaseDumpPath)) {
    console.error(`❌ Firebase users dump not found at: ${firebaseDumpPath}`);
    process.exit(1);
  }
  const firebaseUsers = JSON.parse(fs.readFileSync(firebaseDumpPath, 'utf8'));
  console.log(`📋 Loaded ${firebaseUsers.length} Firebase users from dump.`);

  // Load mapped users to restore
  if (!fs.existsSync(usersToRestorePath)) {
    console.error(`❌ users_to_restore.json not found at: ${usersToRestorePath}`);
    process.exit(1);
  }
  const usersToRestore = JSON.parse(fs.readFileSync(usersToRestorePath, 'utf8'));
  console.log(`📋 Loaded ${usersToRestore.length} users to restore from mapping file.`);

  // Load existing business owners to avoid inserting their emails into customer users
  const businessOwners = await BusinessOwner.find({});
  const ownerEmails = new Set(businessOwners.map(bo => bo.email.toLowerCase()));
  console.log(`📋 Loaded ${ownerEmails.size} business owner emails to prevent customer conflicts.`);

  // Keep track of counts
  let restoredCount = 0;
  let updatedCount = 0;

  // Track uids and emails we process to prevent duplicates
  const processedEmails = new Set();
  const processedUids = new Set();

  // 1. Process users from users_to_restore.json (these contain the explicit ObjectIDs referenced in database)
  console.log('\n--- RESTORING REFERENCED USERS FROM MAPPINGS ---');
  for (const item of usersToRestore) {
    const userIdStr = item._id;
    console.log(`Processing referenced user ID: ${userIdStr} ("${item.name}")`);

    let email = item.email;
    let name = item.name;
    let firebaseUid = item.firebaseUid;
    let authProvider = 'email';
    let avatar = '';

    // If it has a Firebase UID, look up additional details from Firebase dump
    if (firebaseUid) {
      const fbUser = firebaseUsers.find(u => u.uid === firebaseUid);
      if (fbUser) {
        email = fbUser.email || email;
        name = fbUser.displayName || name;
        avatar = fbUser.photoURL || '';
        
        // Check providerId to determine authProvider
        const firstProvider = fbUser.providerData && fbUser.providerData[0];
        if (firstProvider && firstProvider.providerId) {
          if (firstProvider.providerId.includes('google')) authProvider = 'google';
          else if (firstProvider.providerId.includes('apple')) authProvider = 'apple';
          else if (firstProvider.providerId.includes('facebook')) authProvider = 'facebook';
        } else if (email && email.includes('privaterelay.appleid.com')) {
          authProvider = 'apple';
        } else {
          authProvider = 'google'; // default fallback for OAuth
        }
      }
    }

    // For local accounts or if email is null, generate a placeholder
    if (!email) {
      const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const uniqueSuffix = userIdStr.substring(18);
      email = `${safeName || 'user'}.${uniqueSuffix}@hashview.com`;
    }

    email = email.toLowerCase();

    // Check if user already exists in DB by ID
    let userDoc = await User.findById(userIdStr);
    const isNew = !userDoc;

    if (isNew) {
      userDoc = new User({ _id: new mongoose.Types.ObjectId(userIdStr) });
    }

    userDoc.name = name;
    userDoc.email = email;
    userDoc.role = 'customer';
    userDoc.status = 'active';
    userDoc.emailVerified = true;
    
    if (firebaseUid) {
      userDoc.firebaseUid = firebaseUid;
      userDoc.authProvider = authProvider;
      userDoc.avatar = avatar;
      // Set random password for Firebase OAuth users
      if (isNew || !userDoc.passwordHash) {
        userDoc.passwordHash = Math.random().toString(36) + Math.random().toString(36);
      }
    } else {
      userDoc.authProvider = 'email';
      // Set default Password123! for local users
      if (isNew || !userDoc.passwordHash) {
        userDoc.passwordHash = 'Password123!';
      }
    }

    // Save user document (triggers pre-save hook to hash password)
    await userDoc.save();

    processedEmails.add(email);
    if (firebaseUid) processedUids.add(firebaseUid);

    if (isNew) {
      restoredCount++;
      console.log(`  🟢 Restored user: "${name}" (${email}) with ID: ${userIdStr}`);
    } else {
      updatedCount++;
      console.log(`  🟡 Updated existing user: "${name}" (${email}) with ID: ${userIdStr}`);
    }
  }

  // 2. Process remaining Firebase users who did NOT have references in the database
  console.log('\n--- RESTORING REMAINING FIREBASE USERS ---');
  for (const fbUser of firebaseUsers) {
    if (processedUids.has(fbUser.uid)) continue;

    const email = (fbUser.email || '').toLowerCase();
    if (!email) {
      console.log(`  ⚠️ Skipping Firebase user ${fbUser.uid} (no email)`);
      continue;
    }

    // Skip if email belongs to a business owner
    if (ownerEmails.has(email)) {
      console.log(`  ⚠️ Skipping Firebase user ${fbUser.uid} (${email}) - registered as Business Owner`);
      continue;
    }

    // Skip if email was already processed
    if (processedEmails.has(email)) {
      console.log(`  ⚠️ Skipping Firebase user ${fbUser.uid} (${email}) - already processed`);
      continue;
    }

    // Check if the user already exists in DB by email
    let userDoc = await User.findOne({ email: email });
    const isNew = !userDoc;

    let authProvider = 'google';
    const firstProvider = fbUser.providerData && fbUser.providerData[0];
    if (firstProvider && firstProvider.providerId) {
      if (firstProvider.providerId.includes('google')) authProvider = 'google';
      else if (firstProvider.providerId.includes('apple')) authProvider = 'apple';
      else if (firstProvider.providerId.includes('facebook')) authProvider = 'facebook';
    } else if (email.includes('privaterelay.appleid.com')) {
      authProvider = 'apple';
    }

    if (isNew) {
      userDoc = new User({
        name: fbUser.displayName || 'User',
        email: email,
        firebaseUid: fbUser.uid,
        authProvider: authProvider,
        role: 'customer',
        status: 'active',
        emailVerified: true,
        avatar: fbUser.photoURL || '',
        passwordHash: Math.random().toString(36) + Math.random().toString(36)
      });
      await userDoc.save();
      restoredCount++;
      console.log(`  🟢 Restored Firebase user: "${userDoc.name}" (${email})`);
    } else {
      userDoc.firebaseUid = fbUser.uid;
      userDoc.authProvider = authProvider;
      if (fbUser.photoURL) userDoc.avatar = fbUser.photoURL;
      await userDoc.save();
      updatedCount++;
      console.log(`  🟡 Updated Firebase link for existing user: "${userDoc.name}" (${email})`);
    }

    processedEmails.add(email);
    processedUids.add(fbUser.uid);
  }

  // 3. Ensure Admin accounts exist
  console.log('\n--- VERIFYING ADMIN ACCOUNTS ---');
  const admins = [
    { email: 'admin@hashview.com', name: 'HashView Admin', role: 'admin' },
    { email: 'hashview01@gmail.com', name: 'HashView Support Admin', role: 'admin' }
  ];

  for (const admin of admins) {
    let adminDoc = await User.findOne({ email: admin.email });
    if (!adminDoc) {
      adminDoc = new User({
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: 'active',
        emailVerified: true,
        passwordHash: 'Password123!' // Admin default password
      });
      await adminDoc.save();
      restoredCount++;
      console.log(`  🛡️ Recreated missing admin account: ${admin.email}`);
    } else {
      console.log(`  🛡️ Admin account exists: ${admin.email} (role: ${adminDoc.role})`);
    }
  }

  console.log('\n--- RESTORATION SUMMARY ---');
  console.log(`Total users restored (created): ${restoredCount}`);
  console.log(`Total users updated: ${updatedCount}`);

  // Fetch final user count in DB
  const finalCount = await User.countDocuments({});
  console.log(`Total User documents currently in MongoDB users collection: ${finalCount}`);

  await mongoose.disconnect();
  console.log('✅ Done! Disconnected from database.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Database restoration failed:', err);
  process.exit(1);
});
