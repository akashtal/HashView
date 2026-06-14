const Order = require('../models/Order.model');
const billingEngine = require('../services/billingEngine');
const orderService = require('../services/orderService');
const { notificationsQueue } = require('../services/queueService');
const { dispatchWebhook } = require('../services/webhookService');

// @desc    Create a new order
// @route   POST /api/orders
// @access  Public (or Private depending on user)
exports.createOrder = async (req, res) => {
  try {
    const { businessId, items, customerName, tableNumber, numberOfPeople, specialInstructions } = req.body;
    const customerId = req.user ? req.user.id : null; // if logged in

    if (!businessId || !items || !items.length || !customerName || !tableNumber) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // Idempotency check
    const idempotencyKey = req.headers['idempotency-key'];
    let redisConfig;
    if (idempotencyKey) {
      redisConfig = require('../config/redis');
      const cachedOrder = await redisConfig.getCache(`idempotency:${idempotencyKey}`);
      if (cachedOrder) {
        return res.status(200).json({
          success: true,
          data: cachedOrder,
          message: 'Order created previously (idempotent request)'
        });
      }
    }

    // 1. Validate Items & Prices against DB
    const validation = await orderService.validateItems(items);
    if (!validation.isValid) {
      return res.status(400).json({ success: false, message: validation.errorMessage });
    }

    // 2. Calculate Final Bill dynamically using the billing engine
    const billingDetails = await billingEngine.calculateBill(businessId, validation.validatedSubtotal, {
      guestCount: numberOfPeople,
      timePlaced: new Date()
    });

    // 3. Generate Order Number
    const orderNumber = await orderService.generateOrderNumber();

    // 4. Format items for DB
    const formattedItems = items.map(item => ({
      menuItem: item.menuItem._id,
      name: item.menuItem.name,
      price: item.menuItem.price,
      currency: item.menuItem.currency,
      quantity: item.quantity,
      modifiers: item.selectedModifiers || [],
      addOns: item.selectedAddOns || [],
      itemNotes: item.itemNotes || '',
      itemTotal: item.itemTotal
    }));

    // 5. Create Order
    const order = await Order.create({
      business: businessId,
      customer: customerId,
      orderNumber,
      customerName,
      tableNumber,
      numberOfPeople: numberOfPeople || 1,
      items: formattedItems,
      billing: billingDetails,
      orderNotes: specialInstructions || '',
      status: 'new'
    });

    // 6. Record initial history
    await orderService.recordHistory(
      order._id, 
      null, 
      'new', 
      customerId || 'guest', 
      customerId ? 'customer' : 'system', 
      'Order placed'
    );

    // 7. Emit Real-Time Socket Event
    const orderSocket = require('../sockets/order.socket');
    orderSocket.emitNewOrder(businessId, order);

    // 8. Enqueue Push Notification
    await notificationsQueue.add('order.created', {
      type: 'order.created',
      payload: {
        orderId: order._id,
        businessId: order.business,
        businessName: 'Your Business', // In reality, we could populate this
        orderNumber: order.orderNumber,
        tableNumber: order.tableNumber,
        totalAmount: order.billing.grandTotal
      }
    });

    // 9. Dispatch Webhook
    dispatchWebhook(businessId, 'order.created', order);

    // Cache for idempotency if key provided
    if (idempotencyKey && redisConfig) {
      await redisConfig.setCache(`idempotency:${idempotencyKey}`, order, 86400); // 24 hours
    }

    res.status(201).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get order details
// @route   GET /api/orders/:id
// @access  Public (or Private depending on user/owner)
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('business', 'name logo coverImage currency')
      .populate('items.menuItem', 'name image');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get user's own orders
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('business', 'name logo coverImage currency')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching my orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get order list for a business (dashboard)
// @route   GET /api/orders/business/:businessId
// @access  Private (Business Owner)
exports.getBusinessOrders = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { status, limit = 50, page = 1 } = req.query;

    const query = { business: businessId };
    
    if (status) {
      if (status === 'active') {
        query.status = { $nin: ['delivered', 'cancelled'] };
      } else {
        query.status = status;
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      count: orders.length,
      total,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching business orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get order analytics for a business
// @route   GET /api/orders/business/:businessId/analytics
// @access  Private (Business Owner)
exports.getBusinessOrderAnalytics = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { timeframe = 'daily' } = req.query; // 'daily', 'weekly', 'monthly'
    
    let startDate = new Date();
    if (timeframe === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }
    
    const mongoose = require('mongoose');
    const businessObjectId = new mongoose.Types.ObjectId(businessId);

    // 1. Overall stats (revenue, order count, avg order value)
    const stats = await Order.aggregate([
      { $match: { business: businessObjectId, createdAt: { $gte: startDate } } },
      { $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { 
            $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, '$billing.grandTotal', 0] } 
          },
          statusCounts: {
            $push: '$status'
          }
        }
      }
    ]);
    
    // Process status counts
    const statusBreakdown = { new: 0, accepted: 0, preparing: 0, ready: 0, delivered: 0, cancelled: 0 };
    if (stats.length > 0 && stats[0].statusCounts) {
      stats[0].statusCounts.forEach(status => {
        if (statusBreakdown[status] !== undefined) {
          statusBreakdown[status]++;
        }
      });
    }

    // 2. Time-series data for chart
    // Group by day format (YYYY-MM-DD)
    const timeSeries = await Order.aggregate([
      { $match: { business: businessObjectId, createdAt: { $gte: startDate }, status: 'delivered' } },
      { $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenue: { $sum: '$billing.grandTotal' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 3. Popular Items
    const popularItems = await Order.aggregate([
      { $match: { business: businessObjectId, createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
      { $unwind: "$items" },
      { $group: {
          _id: "$items.name",
          quantityOrdered: { $sum: "$items.quantity" },
          revenue: { $sum: { $multiply: ["$items.quantity", "$items.price"] } }
        }
      },
      { $sort: { quantityOrdered: -1 } },
      { $limit: 5 }
    ]);

    // 4. Peak Hours
    const peakHours = await Order.aggregate([
      { $match: { business: businessObjectId, createdAt: { $gte: startDate } } },
      { $group: {
          _id: { $hour: "$createdAt" },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // 5. Table Analytics
    const tableStats = await Order.aggregate([
      { $match: { business: businessObjectId, createdAt: { $gte: startDate }, status: { $nin: ['cancelled'] } } },
      { $group: {
          _id: "$tableNumber",
          orders: { $sum: 1 },
          revenue: { $sum: "$billing.grandTotal" }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: 10 }
    ]);

    const result = {
      totalOrders: stats.length > 0 ? stats[0].totalOrders : 0,
      totalRevenue: stats.length > 0 ? stats[0].totalRevenue : 0,
      averageOrderValue: stats.length > 0 && stats[0].totalOrders > 0 
        ? (stats[0].totalRevenue / stats[0].totalOrders) 
        : 0,
      statusBreakdown,
      timeSeries,
      popularItems,
      peakHours,
      tableStats
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Export orders as CSV
// @route   GET /api/orders/business/:businessId/export
// @access  Private (Business Owner)
exports.exportBusinessOrdersCSV = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { timeframe = 'monthly' } = req.query;
    
    let startDate = new Date();
    if (timeframe === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'weekly') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (timeframe === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 1);
    }

    const orders = await Order.find({
      business: businessId,
      createdAt: { $gte: startDate }
    }).sort('-createdAt').lean();

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found for this timeframe to export' });
    }

    // Format for CSV
    const csvData = orders.map(order => ({
      'Order Number': order.orderNumber,
      'Date': new Date(order.createdAt).toLocaleString(),
      'Table': order.tableNumber || 'N/A',
      'Customer': order.customerName || 'Guest',
      'Items Count': order.items?.length || 0,
      'Total Amount': order.billing?.grandTotal?.toFixed(2) || '0.00',
      'Status': order.status
    }));

    const { Parser } = require('json2csv');
    const json2csvParser = new Parser();
    const csv = json2csvParser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-${timeframe}-${Date.now()}.csv"`);
    
    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting orders CSV:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get customer order history
// @route   GET /api/orders/my-orders
// @access  Private (Customer)
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id })
      .populate('business', 'name logo')
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Business Owner)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!orderService.isValidTransition(order.status, status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid status transition from ${order.status} to ${status}` 
      });
    }

    const previousStatus = order.status;
    order.status = status;

    if (status === 'accepted') order.acceptedAt = Date.now();
    if (status === 'preparing') order.preparingAt = Date.now();
    if (status === 'ready') order.readyAt = Date.now();
    if (status === 'delivered') order.deliveredAt = Date.now();

    await order.save();

    await orderService.recordHistory(
      order._id,
      previousStatus,
      status,
      req.user ? req.user.id : 'system',
      'business',
      `Status updated to ${status}`
    );

    // Emit Real-Time Socket Event
    const orderSocket = require('../sockets/order.socket');
    orderSocket.emitOrderStatusUpdate(orderId, order.business, order);

    // Dispatch Webhook
    dispatchWebhook(order.business, 'order.updated', order);

    // Enqueue Push Notification
    await notificationsQueue.add('order.status_changed', {
      type: 'order.status_changed',
      payload: {
        orderId: order._id,
        customerId: order.customer,
        status: order.status,
        businessName: 'The Restaurant', // Would usually be populated
        orderNumber: order.orderNumber
      }
    });

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Bulk update multiple orders
// @route   PATCH /api/orders/bulk-update
// @access  Private (Business or Admin)
exports.bulkUpdateOrders = async (req, res) => {
  try {
    const { orderIds, status } = req.body;
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds array is required' });
    }

    const orders = await Order.find({ _id: { $in: orderIds } });
    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: 'No orders found' });
    }

    const updatedOrders = [];
    const orderSocket = require('../sockets/order.socket');

    // Process each order independently to ensure proper validation and webhooks
    for (const order of orders) {
      // Authorization check
      if (req.user.role === 'business') {
        const BusinessOwner = require('../models/BusinessOwner.model');
        const isOwner = await BusinessOwner.exists({ _id: req.user.id, 'businesses.business': order.business });
        if (!isOwner) continue;
      }

      if (!orderService.isValidTransition(order.status, status)) continue;

      const previousStatus = order.status;
      order.status = status;

      if (status === 'accepted') order.acceptedAt = Date.now();
      if (status === 'preparing') order.preparingAt = Date.now();
      if (status === 'ready') order.readyAt = Date.now();
      if (status === 'delivered') order.deliveredAt = Date.now();

      await order.save();

      await orderService.recordHistory(
        order._id, previousStatus, status, req.user.id, 'business', `Bulk status updated to ${status}`
      );

      orderSocket.emitOrderStatusUpdate(order._id, order.business, order);
      dispatchWebhook(order.business, 'order.updated', order);
      
      updatedOrders.push(order._id);
    }

    res.status(200).json({
      success: true,
      message: `Successfully updated ${updatedOrders.length} out of ${orderIds.length} orders`,
      updatedOrderIds: updatedOrders
    });
  } catch (error) {
    console.error('Error in bulk update:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Cancel order
// @route   POST /api/orders/:id/cancel
// @access  Private (Customer or Business)
exports.cancelOrder = async (req, res) => {
  try {
    const { cancelReason } = req.body;
    const orderId = req.params.id;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!orderService.isValidTransition(order.status, 'cancelled')) {
      return res.status(400).json({ 
        success: false, 
        message: `Order cannot be cancelled from status ${order.status}` 
      });
    }

    const previousStatus = order.status;
    order.status = 'cancelled';
    order.cancelledAt = Date.now();
    order.cancelReason = cancelReason || 'No reason provided';
    order.cancelledBy = req.user ? (req.user.role === 'customer' ? 'customer' : 'business') : 'system';

    await order.save();

    await orderService.recordHistory(
      order._id,
      previousStatus,
      'cancelled',
      req.user ? req.user.id : 'system',
      order.cancelledBy,
      `Order cancelled. Reason: ${order.cancelReason}`
    );

    // Emit Real-Time Socket Event
    const orderSocket = require('../sockets/order.socket');
    orderSocket.emitOrderStatusUpdate(orderId, order.business, order);

    // Dispatch Webhook
    dispatchWebhook(order.business, 'order.cancelled', order);

    // Enqueue Push Notification
    await notificationsQueue.add('order.status_changed', {
      type: 'order.status_changed',
      payload: {
        orderId: order._id,
        customerId: order.customer,
        status: order.status,
        businessName: 'The Restaurant', // Would usually be populated
        orderNumber: order.orderNumber
      }
    });

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get order invoice data
// @route   GET /api/orders/:id/invoice
// @access  Private (Customer or Business)
exports.getOrderInvoice = async (req, res, next) => {
  try {
    const invoiceService = require('../services/invoiceService');
    const invoiceData = await invoiceService.generateInvoiceData(req.params.id);
    res.status(200).json({ success: true, data: invoiceData });
  } catch (error) {
    if (error.message === 'Order not found') {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    next(error);
  }
};
// @desc    Export all customer orders (GDPR)
// @route   GET /api/orders/gdpr/export
// @access  Private (Customer)
exports.exportGDPROrderData = async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id }).lean();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="gdpr_orders_export.json"');
    res.status(200).send(JSON.stringify(orders, null, 2));
  } catch (error) {
    logger.error('GDPR Export Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Delete all customer orders or anonymize (GDPR)
// @route   DELETE /api/orders/gdpr/delete
// @access  Private (Customer)
exports.deleteGDPROrderData = async (req, res) => {
  try {
    // For business accounting reasons, we cannot actually DELETE orders from the DB.
    // GDPR allows anonymization as an alternative to hard deletion.
    await Order.updateMany(
      { customer: req.user.id },
      { 
        $unset: { customer: "" }, 
        $set: { customerName: "Anonymized User" } 
      }
    );
    res.status(200).json({ success: true, message: 'Order data anonymized successfully' });
  } catch (error) {
    logger.error('GDPR Delete Error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
