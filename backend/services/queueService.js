const { Queue } = require('bullmq');

const redisOptions = {
  url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
};

const notificationsQueue = new Queue('notifications', { connection: redisOptions });

module.exports = {
  notificationsQueue
};
