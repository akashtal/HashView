const cron = require('node-cron');
const Order = require('../models/Order.model');
const OrderArchive = require('../models/OrderArchive.model');
const logger = require('./logger');

/**
 * Archival Job: Moves orders older than 90 days to OrderArchive collection.
 * Runs daily at 3:00 AM server time.
 */
const initArchivalJob = () => {
  cron.schedule('0 3 * * *', async () => {
    logger.info('📦 Running nightly order archival job...');
    try {
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      // 1. Find orders older than 90 days
      const oldOrders = await Order.find({ createdAt: { $lt: ninetyDaysAgo } }).lean();

      if (oldOrders.length === 0) {
        logger.info('📦 No orders found to archive today.');
        return;
      }

      // 2. Map to archive schema
      const archiveDocs = oldOrders.map(order => ({
        ...order,
        originalCreatedAt: order.createdAt,
        originalUpdatedAt: order.updatedAt,
        _id: order._id // preserve original ID
      }));

      // 3. Insert into OrderArchive
      await OrderArchive.insertMany(archiveDocs, { ordered: false });

      // 4. Delete from Order
      const orderIds = oldOrders.map(o => o._id);
      await Order.deleteMany({ _id: { $in: orderIds } });

      logger.info(`✅ Successfully archived ${oldOrders.length} orders older than 90 days.`);
    } catch (error) {
      logger.error('❌ Error during order archival job:', error);
    }
  });
};

module.exports = { initArchivalJob };
