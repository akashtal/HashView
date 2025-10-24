const Redis = require('ioredis');

let redis = null;

const connectRedis = () => {
  try {
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        enableReadyCheck: false,
        maxRetriesPerRequest: null,
      });

      redis.on('connect', () => {
        console.log('🔴 Redis Connected');
      });

      redis.on('error', (err) => {
        console.error('Redis connection error:', err);
      });

      redis.on('close', () => {
        console.log('Redis connection closed');
      });
    } else {
      console.log('⚠️  Redis not configured, using in-memory storage');
    }
  } catch (error) {
    console.error('Redis connection failed:', error.message);
  }
};

const getRedis = () => {
  return redis;
};

module.exports = { connectRedis, getRedis };
