const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customerName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  tableNumber: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20
  },
  numberOfPeople: {
    type: Number,
    required: true,
    min: 1,
    max: 50,
    default: 1
  },
  items: [{
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    name: String,
    price: Number,
    currency: String,
    quantity: { type: Number, min: 1 },
    customizationSelections: [{
      groupName: String,
      optionName: String,
      priceAdjustment: Number
    }],
    modifiers: [{
      name: String,
      selectedOption: String,
      priceAdjustment: Number
    }],
    addOns: [{
      name: String,
      price: Number,
      quantity: Number
    }],
    itemNotes: String,
    itemTotal: Number
  }],
  billing: {
    subtotal: { type: Number, required: true },
    taxes: [{
      taxRuleId: mongoose.Schema.Types.ObjectId,
      name: String,
      type: { type: String, enum: ['percentage', 'fixed'] }, // using nested object due to 'type' key
      rate: Number,
      calculationMode: { type: String, enum: ['inclusive', 'exclusive'] },
      applicability: { type: String, enum: ['entire_order', 'category', 'item'] },
      amount: Number
    }],
    charges: [{
      chargeRuleId: mongoose.Schema.Types.ObjectId,
      name: String,
      type: { type: String, enum: ['percentage', 'fixed'] }, // using nested object due to 'type' key
      rate: Number,
      amount: Number
    }],
    totalTax: { type: Number, default: 0 },
    totalCharges: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['new', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled'],
    default: 'new',
    index: true
  },
  cancelReason: String,
  cancelledBy: {
    type: String,
    enum: ['customer', 'business', 'system']
  },
  orderNotes: {
    type: String,
    maxlength: 500
  },
  placedAt: { type: Date, default: Date.now },
  acceptedAt: Date,
  preparingAt: Date,
  readyAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  invoiceNumber: String,
  invoiceGenerated: { type: Boolean, default: false }
}, {
  timestamps: true
});

orderSchema.index({ business: 1, status: 1, createdAt: -1 });
orderSchema.index({ business: 1, createdAt: -1 });
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ business: 1, tableNumber: 1, status: 1 });
orderSchema.index({ status: 1, createdAt: 1 });

const Order = mongoose.model('Order', orderSchema);
module.exports = Order;
