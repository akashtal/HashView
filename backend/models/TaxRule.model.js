const mongoose = require('mongoose');

const taxRuleSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true // e.g., "VAT", "GST", "State Tax"
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
  calculationMode: {
    type: String,
    enum: ['inclusive', 'exclusive'],
    default: 'exclusive'
  },
  applicability: {
    type: String,
    enum: ['entire_order', 'category', 'item'],
    default: 'entire_order'
  },
  applicableCategories: [{
    type: String // List of categories this tax applies to, if applicability === 'category'
  }],
  applicableItems: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem' // List of items this tax applies to, if applicability === 'item'
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const TaxRule = mongoose.model('TaxRule', taxRuleSchema);
module.exports = TaxRule;
