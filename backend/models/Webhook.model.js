const mongoose = require('mongoose');

const webhookSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  url: {
    type: String,
    required: true,
    trim: true,
    match: /^https?:\/\//
  },
  secret: {
    type: String,
    required: true,
    default: () => require('crypto').randomBytes(32).toString('hex') // for HMAC signing
  },
  events: [{
    type: String,
    enum: ['order.created', 'order.updated', 'order.cancelled', 'billing.updated']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  failureCount: {
    type: Number,
    default: 0
  }
}, { timestamps: true });

const Webhook = mongoose.model('Webhook', webhookSchema);
module.exports = Webhook;
