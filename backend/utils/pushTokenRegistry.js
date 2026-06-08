const { Expo } = require('expo-server-sdk');
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');

const getModelForUser = (user) => (user?.role === 'business' ? BusinessOwner : User);
const getModelNameForUser = (user) => (user?.role === 'business' ? 'BusinessOwner' : 'User');

const normalizePushToken = (token) => (typeof token === 'string' ? token.trim() : '');

const getActivePushTokenEntries = (user, modelName = getModelNameForUser(user)) => {
  const seen = new Set();
  const entries = [];

  const addEntry = (token, extra = {}) => {
    const normalizedToken = normalizePushToken(token);
    if (!normalizedToken || seen.has(normalizedToken)) return;

    seen.add(normalizedToken);
    entries.push({
      userId: user._id,
      modelName,
      token: normalizedToken,
      email: user.email,
      ...extra
    });
  };

  addEntry(user.pushToken, { legacy: true });

  (user.pushTokens || []).forEach((record) => {
    if (record?.disabledAt) return;
    addEntry(record.token, {
      platform: record.platform,
      deviceId: record.deviceId,
      installationId: record.installationId
    });
  });

  return entries;
};

const removePushTokenEverywhere = async (token) => {
  const normalizedToken = normalizePushToken(token);
  if (!normalizedToken) return;

  await Promise.all([
    User.updateMany({ pushToken: normalizedToken }, { $set: { pushToken: null } }),
    BusinessOwner.updateMany({ pushToken: normalizedToken }, { $set: { pushToken: null } }),
    User.updateMany({ 'pushTokens.token': normalizedToken }, { $pull: { pushTokens: { token: normalizedToken } } }),
    BusinessOwner.updateMany({ 'pushTokens.token': normalizedToken }, { $pull: { pushTokens: { token: normalizedToken } } })
  ]);
};

const detachTokenFromOtherAccounts = async (token, currentUser) => {
  const normalizedToken = normalizePushToken(token);
  const currentId = currentUser._id;

  await Promise.all([
    User.updateMany(
      { _id: { $ne: currentId }, pushToken: normalizedToken },
      { $set: { pushToken: null } }
    ),
    BusinessOwner.updateMany(
      { _id: { $ne: currentId }, pushToken: normalizedToken },
      { $set: { pushToken: null } }
    ),
    User.updateMany(
      { _id: { $ne: currentId }, 'pushTokens.token': normalizedToken },
      { $pull: { pushTokens: { token: normalizedToken } } }
    ),
    BusinessOwner.updateMany(
      { _id: { $ne: currentId }, 'pushTokens.token': normalizedToken },
      { $pull: { pushTokens: { token: normalizedToken } } }
    )
  ]);
};

const registerDevicePushToken = async (user, rawToken, metadata = {}) => {
  const token = normalizePushToken(rawToken);

  if (!Expo.isExpoPushToken(token)) {
    const error = new Error('Invalid Expo push token');
    error.code = 'INVALID_EXPO_PUSH_TOKEN';
    throw error;
  }

  await detachTokenFromOtherAccounts(token, user);

  if (!Array.isArray(user.pushTokens)) {
    user.pushTokens = [];
  }

  const now = new Date();
  const existingRecord = user.pushTokens.find((record) => record.token === token);
  const nextRecord = {
    token,
    platform: metadata.platform || existingRecord?.platform || 'unknown',
    deviceId: metadata.deviceId || existingRecord?.deviceId || null,
    installationId: metadata.installationId || existingRecord?.installationId || null,
    appVersion: metadata.appVersion || existingRecord?.appVersion || null,
    lastRegisteredAt: now,
    disabledAt: null,
    lastError: null,
    lastErrorAt: null
  };

  if (existingRecord) {
    Object.assign(existingRecord, nextRecord);
  } else {
    user.pushTokens.push(nextRecord);
  }

  user.pushToken = token;
  user.pushTokenUpdatedAt = now;
  user.markModified('pushTokens');
  try {
    await user.save();
  } catch (saveError) {
    if (saveError.name === 'VersionError') {
      console.log(`[Push] VersionError caught (harmless due to concurrent registration) for user ${user._id}`);
    } else {
      throw saveError;
    }
  }

  return {
    token,
    activeTokenCount: getActivePushTokenEntries(user).length
  };
};

module.exports = {
  getActivePushTokenEntries,
  getModelForUser,
  getModelNameForUser,
  normalizePushToken,
  registerDevicePushToken,
  removePushTokenEverywhere
};
