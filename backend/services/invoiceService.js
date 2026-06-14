const Order = require('../models/Order.model');
const Business = require('../models/Business.model');

/**
 * Generates structured invoice data for an order
 * @param {string} orderId 
 * @returns {object} Full invoice JSON
 */
exports.generateInvoiceData = async (orderId) => {
  const order = await Order.findById(orderId).populate('business');
  
  if (!order) {
    throw new Error('Order not found');
  }

  const business = order.business;

  // Format the invoice data payload
  const invoiceData = {
    invoiceNumber: `INV-${order.orderNumber}`,
    date: order.createdAt,
    businessInfo: {
      name: business.name,
      address: business.address,
      taxId: business.gstNumber || business.taxId || 'N/A', // fallback depending on Business schema
      phone: business.phone,
      email: business.email
    },
    customerInfo: {
      name: order.customerName,
      tableNumber: order.tableNumber,
      guestCount: order.numberOfPeople
    },
    orderSummary: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus || 'pending'
    },
    lineItems: order.items.map(item => ({
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      totalPrice: item.price * item.quantity,
      modifiers: item.modifiers,
      addOns: item.addOns
    })),
    billing: order.billingSnapshot // Subtotal, taxes, charges, grandTotal
  };

  return invoiceData;
};
