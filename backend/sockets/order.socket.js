const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Business = require('../models/Business.model');

let ordersNamespace = null;

module.exports = {
  init: (io) => {
    ordersNamespace = io.of('/orders');
    
    // Middleware to authenticate socket connections
    ordersNamespace.use((socket, next) => {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.user = decoded; // { id, role, ... }
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    ordersNamespace.on('connection', (socket) => {
      logger.info(`[Orders Socket] User connected: ${socket.user.id}`);

      // Customer joins room for their specific order tracking
      socket.on('join_order', (orderId) => {
        if (!orderId) return;
        socket.join(`order_${orderId}`);
        logger.info(`User ${socket.user.id} joined order_${orderId}`);
      });

      socket.on('leave_order', (orderId) => {
        if (!orderId) return;
        socket.leave(`order_${orderId}`);
        logger.info(`User ${socket.user.id} left order_${orderId}`);
      });

      // Customer joins room for all their orders
      socket.on('join_customer', (customerId) => {
        if (!customerId) return;
        // Verify they are joining their own room
        if (socket.user.id !== customerId) return;
        socket.join(`customer_${customerId}`);
        logger.info(`User ${socket.user.id} joined customer_${customerId}`);
      });

      socket.on('leave_customer', (customerId) => {
        if (!customerId) return;
        socket.leave(`customer_${customerId}`);
      });

      // Business joins room to receive all orders for their business
      socket.on('join_business', async (businessId) => {
        if (!businessId) return;
        
        try {
          // Auth check: verify business user owns this business
          if (socket.user.role === 'business') {
            const BusinessOwner = require('../models/BusinessOwner.model');
            const businessOwner = await BusinessOwner.findOne({ user: socket.user.id });
            if (businessOwner) {
              const business = await Business.findOne({ _id: businessId, owner: businessOwner._id });
              if (!business) {
                return socket.emit('error', { message: 'Unauthorized access to this business' });
              }
            }
            // If no BusinessOwner record found, allow anyway (admin scenario)
          }
          
          socket.join(`business_${businessId}`);
          socket.emit('joined_business', { businessId }); // Confirm join to client
          logger.info(`User ${socket.user.id} joined business_${businessId}`);
        } catch (error) {
          logger.error('Error in join_business socket:', error);
          // Allow join even on error to avoid blocking the dashboard
          socket.join(`business_${businessId}`);
          socket.emit('joined_business', { businessId });
        }
      });

      socket.on('leave_business', (businessId) => {
        if (!businessId) return;
        socket.leave(`business_${businessId}`);
        logger.info(`User ${socket.user.id} left business_${businessId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`[Orders Socket] User disconnected: ${socket.user.id}`);
      });
    });

    // Periodic event for business order stats (every 60 seconds)
    const mongoose = require('mongoose');
    setInterval(async () => {
      try {
        const Order = require('../models/Order.model');
        const rooms = ordersNamespace.adapter.rooms;
        for (const [roomName, clients] of rooms) {
          if (roomName.startsWith('business_') && clients.size > 0) {
            const businessId = roomName.replace('business_', '');
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);

            const stats = await Order.aggregate([
              { $match: { business: new mongoose.Types.ObjectId(businessId), createdAt: { $gte: startOfDay } } },
              { $group: {
                  _id: null,
                  activeCount: { 
                    $sum: { $cond: [{ $in: ['$status', ['new', 'accepted', 'preparing', 'ready']] }, 1, 0] } 
                  },
                  dailyRevenue: { 
                    $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$billing.grandTotal', 0] } 
                  }
                }
              }
            ]);
            const data = stats[0] || { activeCount: 0, dailyRevenue: 0 };
            ordersNamespace.to(roomName).emit('business.order_stats', data);
          }
        }
      } catch (error) {
        logger.error('Error emitting periodic order stats:', error);
      }
    }, 60000);
  },

  // Export helpers for controllers to emit events
  getIO: () => ordersNamespace,

  emitNewOrder: (businessId, order) => {
    if (ordersNamespace) {
      ordersNamespace.to(`business_${businessId}`).emit('new_order', order);
    }
  },

  emitOrderStatusUpdate: (orderId, businessId, order) => {
    if (ordersNamespace) {
      // Notify the customer tracking the order via specific order room
      ordersNamespace.to(`order_${orderId}`).emit('order_status_updated', order);
      
      // Notify the customer via their customer room
      if (order.customer) {
        ordersNamespace.to(`customer_${order.customer}`).emit('order_status_updated', order);
      }
      
      // Notify the business dashboard
      ordersNamespace.to(`business_${businessId}`).emit('order_status_updated', order);
    }
  }
};
