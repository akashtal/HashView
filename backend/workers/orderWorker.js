const { Worker } = require('bullmq');
const redisConfig = require('../config/redis');

let orderWorker = null;

if (process.env.DISABLE_REDIS_QUEUES !== 'true') {
  orderWorker = new Worker('orders', async job => {
    if (job.name === 'order.created') {
      console.log(`Processing new order: ${job.data.orderId}`);
    }
  }, {
    connection: redisConfig.getConnectionOptions() // pseudo-code depending on actual redis.js
  });

  orderWorker.on('completed', job => {
    console.log(`Job with id ${job.id} has been completed`);
  });

  orderWorker.on('failed', (job, err) => {
    console.log(`Job with id ${job.id} has failed with ${err.message}`);
  });
}
