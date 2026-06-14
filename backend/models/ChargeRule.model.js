const mongoose = require('mongoose');

const chargeRuleSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true // e.g., "Service Charge", "Packaging Fee"
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  rate: {
    type: Number,
    required: true,
    min: 0
  },
  isConditional: {
    type: Boolean,
    default: false
  },
  conditionType: {
    type: String,
    enum: ['guest_count', 'order_value', 'time_of_day', 'none'],
    default: 'none'
  },
  conditionValue: {
    type: Number,
    default: null // e.g., guest_count > 6, or order_value < 10
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const ChargeRule = mongoose.model('ChargeRule', chargeRuleSchema);
module.exports = ChargeRule;
