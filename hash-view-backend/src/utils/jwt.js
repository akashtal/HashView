const jwt = require('jsonwebtoken');
const { getRedis } = require('../config/redis');

const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

  return { accessToken, refreshToken };
};

const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });
};

const blacklistToken = async (token) => {
  const redis = getRedis();
  if (redis) {
    try {
      const decoded = jwt.decode(token);
      const exp = decoded.exp;
      const ttl = exp - Math.floor(Date.now() / 1000);
      
      if (ttl > 0) {
        await redis.setex(`blacklist:${token}`, ttl, 'true');
      }
    } catch (error) {
      console.error('Error blacklisting token:', error);
    }
  }
};

module.exports = {
  generateTokens,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  blacklistToken
};
