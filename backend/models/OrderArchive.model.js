const mongoose = require('mongoose');

// This schema mirrors Order.model.js but is used exclusively for long-term cold storage.
// Indexes are minimized to save space since this is rarely queried.
const orderArchiveSchema = new mongoose.Schema({
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
    required: true
  },
  customerName: String,
  tableNumber: String,
  numberOfPeople: Number,
  items: Array, // Flexible schema for archived items
  billing: Object, // Flexible schema for archived billing
  status: String,
  cancelReason: String,
  cancelledBy: String,
  orderNotes: String,
  placedAt: Date,
  acceptedAt: Date,
  preparingAt: Date,
  readyAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  invoiceNumber: String,
  invoiceGenerated: Boolean,
  originalCreatedAt: Date,
  originalUpdatedAt: Date,
  archivedAt: { type: Date, default: Date.now }
});

const OrderArchive = mongoose.model('OrderArchive', orderArchiveSchema);
module.exports = OrderArchive;
