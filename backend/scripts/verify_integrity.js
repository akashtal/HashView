/**
 * Database Integrity and Verification Script for HashView
 * Checks for any orphaned user references in reviews, coupons, and notifications.
 * 
 * Run using: node scripts/verify_integrity.js
 */

require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const Review = require('../models/Review.model');
const Coupon = require('../models/Coupon.model');
const Notification = require('../models/Notification.model');

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://hashview2025:hashview@ac-ztcihbp-shard-00-00.fvr6ve4.mongodb.net:27017,ac-ztcihbp-shard-00-01.fvr6ve4.mongodb.net:27017,ac-ztcihbp-shard-00-02.fvr6ve4.mongodb.net:27017/hashview?ssl=true&replicaSet=atlas-79967p-shard-0&authSource=admin&retryWrites=true&w=majority';
  
  console.log('Connecting to MongoDB Atlas...');
  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  // Load all user IDs
  const usersList = await User.find({}, '_id name email role');
  const userMap = new Map();
  usersList.forEach(u => userMap.set(u._id.toString(), u));
  console.log(`📋 Loaded ${userMap.size} users from MongoDB`);

  // Load all business owner IDs
  const ownersList = await BusinessOwner.find({}, '_id name email');
  const ownerMap = new Map();
  ownersList.forEach(o => ownerMap.set(o._id.toString(), o));
  console.log(`📋 Loaded ${ownerMap.size} business owners from MongoDB`);

  let totalOrphans = 0;

  // 1. Validate Reviews
  console.log('\n--- VALIDATING REVIEWS ---');
  const reviews = await Review.find({});
  let reviewOrphans = 0;
  for (const r of reviews) {
    if (r.user) {
      const uId = r.user.toString();
      if (!userMap.has(uId)) {
        console.error(`❌ Review ${r._id} has orphaned user reference: ${uId} (Business: ${r.business}, Comment: "${r.comment.substring(0, 30)}...")`);
        reviewOrphans++;
      }
    }
    if (r.helpful && r.helpful.length > 0) {
      for (const hUser of r.helpful) {
        const huId = hUser.toString();
        if (!userMap.has(huId)) {
          console.error(`❌ Review ${r._id} has orphaned helpful user reference: ${huId}`);
          reviewOrphans++;
        }
      }
    }
  }
  console.log(`✅ Checked ${reviews.length} reviews. Found ${reviewOrphans} orphaned references.`);
  totalOrphans += reviewOrphans;

  // 2. Validate Coupons
  console.log('\n--- VALIDATING COUPONS ---');
  const coupons = await Coupon.find({});
  let couponOrphans = 0;
  for (const c of coupons) {
    if (c.user) {
      const uId = c.user.toString();
      if (!userMap.has(uId)) {
        console.error(`❌ Coupon ${c._id} (Code: ${c.code}) has orphaned user reference: ${uId}`);
        couponOrphans++;
      }
    }
    if (c.redeemedBy) {
      const rbId = c.redeemedBy.toString();
      if (!userMap.has(rbId) && !ownerMap.has(rbId)) {
        console.error(`❌ Coupon ${c._id} (Code: ${c.code}) has orphaned redeemedBy reference: ${rbId}`);
        couponOrphans++;
      }
    }
  }
  console.log(`✅ Checked ${coupons.length} coupons. Found ${couponOrphans} orphaned references.`);
  totalOrphans += couponOrphans;

  // 3. Validate Notifications
  console.log('\n--- VALIDATING NOTIFICATIONS ---');
  const notifications = await Notification.find({});
  let notificationOrphans = 0;
  for (const n of notifications) {
    if (n.sentTo) {
      const toId = n.sentTo.toString();
      if (n.sentToModel === 'User') {
        if (!userMap.has(toId)) {
          console.error(`❌ Notification ${n._id} has orphaned User sentTo: ${toId} (Message: "${n.message.substring(0, 30)}...")`);
          notificationOrphans++;
        }
      } else if (n.sentToModel === 'BusinessOwner') {
        if (!ownerMap.has(toId)) {
          console.error(`❌ Notification ${n._id} has orphaned BusinessOwner sentTo: ${toId}`);
          notificationOrphans++;
        }
      }
    }
    if (n.sentBy) {
      const byId = n.sentBy.toString();
      if (!userMap.has(byId)) {
        console.error(`❌ Notification ${n._id} has orphaned sentBy User: ${byId}`);
        notificationOrphans++;
      }
    }
  }
  console.log(`✅ Checked ${notifications.length} notifications. Found ${notificationOrphans} orphaned references.`);
  totalOrphans += notificationOrphans;

  console.log('\n--- INTEGRITY VALIDATION SUMMARY ---');
  if (totalOrphans === 0) {
    console.log('🎉 SUCCESS: 0 orphaned user references found in the database! Integrity is 100% restored.');
  } else {
    console.error(`⚠️ WARNING: Found a total of ${totalOrphans} orphaned references. Please review logs above.`);
  }

  await mongoose.disconnect();
  console.log('✅ Done! Disconnected from database.');
  process.exit(totalOrphans === 0 ? 0 : 1);
})().catch(err => {
  console.error('❌ Database integrity check failed:', err);
  process.exit(1);
});
