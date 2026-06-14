const express = require('express');
const router = express.Router();
const { protect, authorize, optionalAuth } = require('../middleware/auth.middleware');
const orderController = require('../controllers/order.controller');
const { validate } = require('../middleware/validation');
const { createOrderSchema, updateOrderStatusSchema } = require('../middleware/orderValidation');
const { orderCreationLimiter } = require('../middleware/orderRateLimit');
const { businessOrderLimiter } = require('../middleware/businessRateLimiter');

// Create order — optionalAuth so logged-in users have customer ID saved
router.post('/', optionalAuth, orderCreationLimiter, businessOrderLimiter, validate(createOrderSchema), orderController.createOrder);

// Customer specific route
// MUST be before /:id to avoid "my-orders" being parsed as an ID
router.get('/my-orders', protect, orderController.getMyOrders);

// Business specific route
router.get('/business/:businessId/export', protect, authorize('business', 'admin'), orderController.exportBusinessOrdersCSV);
router.get('/business/:businessId/analytics', protect, authorize('business', 'admin'), orderController.getBusinessOrderAnalytics);
router.get('/business/:businessId', protect, authorize('business', 'admin'), orderController.getBusinessOrders);

// General by ID
router.get('/gdpr/export', protect, orderController.exportGDPROrderData);
router.delete('/gdpr/delete', protect, orderController.deleteGDPROrderData);
router.get('/:id', orderController.getOrder);
router.get('/:id/invoice', protect, orderController.getOrderInvoice);

// Status updates
router.patch('/bulk-update', protect, authorize('business', 'admin'), orderController.bulkUpdateOrders);
router.patch('/:id/status', protect, authorize('business', 'admin'), validate(updateOrderStatusSchema), orderController.updateOrderStatus);
router.post('/:id/cancel', protect, orderController.cancelOrder);

module.exports = router;
