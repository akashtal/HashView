const TaxRule = require('../models/TaxRule.model');
const ChargeRule = require('../models/ChargeRule.model');
const billingEngine = require('../services/billingEngine');

// @desc    Get active billing rules (taxes & charges) for a business
// @route   GET /api/billing/rules/:businessId
// @access  Public
exports.getBillingRules = async (req, res) => {
  try {
    const { businessId } = req.params;
    
    const taxes = await TaxRule.find({ business: businessId, isActive: true });
    const charges = await ChargeRule.find({ business: businessId, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        taxes,
        charges
      }
    });
  } catch (error) {
    console.error('Error fetching billing rules:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error fetching billing rules'
    });
  }
};

// @desc    Calculate bill preview based on cart items
// @route   POST /api/billing/preview
// @access  Public
exports.previewBill = async (req, res) => {
  try {
    const { businessId, items, subtotal, guestCount } = req.body;
    
    if (!businessId || !items) {
      return res.status(400).json({ success: false, message: 'businessId and items are required' });
    }

    const bill = await billingEngine.calculateBill(businessId, subtotal, {
      guestCount: guestCount || 1,
      timePlaced: new Date()
    });

    res.status(200).json({
      success: true,
      data: bill
    });
  } catch (error) {
    console.error('Error calculating bill preview:', error);
    res.status(500).json({
      success: false,
      message: 'Server Error calculating bill preview'
    });
  }
};

exports.getBillingHistory = async (req, res, next) => {
  res.status(501).json({ success: false, message: "Not implemented yet" });
};
