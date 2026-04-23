require('dotenv').config();

const mongoose = require('mongoose');
const { Expo } = require('expo-server-sdk');
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const Review = require('../models/Review.model');
const Business = require('../models/Business.model');

const collectTokens = (doc) => {
  const tokens = new Set();
  if (doc.pushToken) tokens.add(doc.pushToken);
  (doc.pushTokens || []).forEach((record) => {
    if (record?.token && !record.disabledAt) tokens.add(record.token);
  });
  return Array.from(tokens);
};

async function summarizeCollection(Model, label) {
  const docs = await Model.find({}).select('email pushToken pushTokens status role favoritePlaces');
  const rows = docs.map((doc) => ({
    id: doc._id.toString(),
    email: doc.email,
    status: doc.status,
    tokens: collectTokens(doc)
  }));

  const withToken = rows.filter((row) => row.tokens.length > 0);
  const invalid = rows.flatMap((row) =>
    row.tokens
      .filter((token) => !Expo.isExpoPushToken(token))
      .map((token) => ({ id: row.id, email: row.email, token }))
  );

  console.log(`\n${label}`);
  console.log(`total=${rows.length}`);
  console.log(`withToken=${withToken.length}`);
  console.log(`multiDevice=${withToken.filter((row) => row.tokens.length > 1).length}`);
  console.log(`invalidTokens=${invalid.length}`);

  if (invalid.length > 0) {
    console.log('invalidTokenSamples=' + JSON.stringify(invalid.slice(0, 10), null, 2));
  }

  return rows;
}

async function run() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const customerRows = await summarizeCollection(User, 'Customer users');
  const ownerRows = await summarizeCollection(BusinessOwner, 'Business owners');

  const tokenOwners = new Map();
  [
    ...customerRows.map((row) => ({ ...row, model: 'User' })),
    ...ownerRows.map((row) => ({ ...row, model: 'BusinessOwner' }))
  ].forEach((row) => {
    row.tokens.forEach((token) => {
      const owners = tokenOwners.get(token) || [];
      owners.push({ model: row.model, id: row.id, email: row.email });
      tokenOwners.set(token, owners);
    });
  });

  const duplicateTokens = Array.from(tokenOwners.entries())
    .filter(([, owners]) => owners.length > 1)
    .map(([token, owners]) => ({ token, owners }));

  console.log(`\nduplicateTokensAcrossAccounts=${duplicateTokens.length}`);
  if (duplicateTokens.length > 0) {
    console.log(JSON.stringify(duplicateTokens.slice(0, 10), null, 2));
  }

  if (process.env.BUSINESS_ID) {
    const [reviewerIds, favouriters] = await Promise.all([
      Review.find({ business: process.env.BUSINESS_ID }).distinct('user'),
      User.find({ favoritePlaces: process.env.BUSINESS_ID, status: 'active' }).select('_id pushToken pushTokens email')
    ]);

    const activeReviewers = reviewerIds.length > 0
      ? await User.find({ _id: { $in: reviewerIds }, status: 'active' }).select('_id pushToken pushTokens email')
      : [];

    const targetMap = new Map();
    [...activeReviewers, ...favouriters].forEach((user) => targetMap.set(user._id.toString(), user));
    const targets = Array.from(targetMap.values());
    const withTokens = targets.filter((user) => collectTokens(user).some((token) => Expo.isExpoPushToken(token)));

    console.log(`\nBusiness target audit for ${process.env.BUSINESS_ID}`);
    console.log(`reviewers=${activeReviewers.length}`);
    console.log(`favouriters=${favouriters.length}`);
    console.log(`uniqueTargets=${targets.length}`);
    console.log(`targetsWithValidExpoToken=${withTokens.length}`);
  }

  const businesses = await Business.find({}).select('_id name');
  const businessRows = [];

  for (const business of businesses) {
    const [reviewerIds, favouriters] = await Promise.all([
      Review.find({ business: business._id }).distinct('user'),
      User.find({ favoritePlaces: business._id, status: 'active' }).select('_id pushToken pushTokens email')
    ]);

    const activeReviewers = reviewerIds.length > 0
      ? await User.find({ _id: { $in: reviewerIds }, status: 'active' }).select('_id pushToken pushTokens email')
      : [];

    const targetMap = new Map();
    [...activeReviewers, ...favouriters].forEach((user) => targetMap.set(user._id.toString(), user));
    const targets = Array.from(targetMap.values());
    const withValidTokens = targets.filter((user) => collectTokens(user).some((token) => Expo.isExpoPushToken(token)));

    if (targets.length > 0) {
      businessRows.push({
        businessId: business._id.toString(),
        name: business.name,
        reviewers: activeReviewers.length,
        favouriters: favouriters.length,
        uniqueTargets: targets.length,
        targetsWithValidExpoToken: withValidTokens.length
      });
    }
  }

  const totalTargets = businessRows.reduce((sum, row) => sum + row.uniqueTargets, 0);
  const totalTargetsWithTokens = businessRows.reduce((sum, row) => sum + row.targetsWithValidExpoToken, 0);

  console.log('\nBusiness reviewer/favourite notification coverage');
  console.log(`businessesWithTargets=${businessRows.length}`);
  console.log(`targetRelationships=${totalTargets}`);
  console.log(`targetRelationshipsWithValidExpoToken=${totalTargetsWithTokens}`);
  console.log('lowestCoverageSamples=' + JSON.stringify(
    businessRows
      .sort((a, b) => (a.targetsWithValidExpoToken / a.uniqueTargets) - (b.targetsWithValidExpoToken / b.uniqueTargets))
      .slice(0, 10),
    null,
    2
  ));

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
