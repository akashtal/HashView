const mongoose = require('mongoose');

const orderStatusHistorySchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['new', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'],
    required: true
  },
  changedBy: {
    type: mongoose.Schema.Types.Mixed, // Can be ObjectId (logged-in user) or string ('system'/'guest')
    default: null
  },
  changedByType: {
    type: String,
    enum: ['business', 'customer', 'system'],
    required: true
  },
  reason: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

const OrderStatusHistory = mongoose.model('OrderStatusHistory', orderStatusHistorySchema);
module.exports = OrderStatusHistory;
