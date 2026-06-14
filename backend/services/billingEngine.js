const TaxRule = require('../models/TaxRule.model');
const ChargeRule = require('../models/ChargeRule.model');

/**
 * Calculates the complete bill breakdown given a subtotal and business rules.
 * @param {string} businessId 
 * @param {number} subtotal 
 * @param {object} orderData { guestCount: number, timePlaced: Date } 
 * @returns {object} { subtotal, taxes, charges, totalTaxAmount, totalChargeAmount, grandTotal }
 */
exports.calculateBill = async (businessId, subtotal, orderData = {}) => {
  const taxes = await TaxRule.find({ business: businessId, isActive: true });
  const charges = await ChargeRule.find({ business: businessId, isActive: true });

  let calculatedTaxes = [];
  let calculatedCharges = [];
  let totalTaxAmount = 0;
  let totalChargeAmount = 0;

  // Calculate Taxes
  taxes.forEach(tax => {
    let amount = 0;
    if (tax.type === 'percentage') {
      amount = subtotal * (tax.rate / 100);
    } else if (tax.type === 'fixed') {
      amount = tax.rate; 
    }
    
    if (amount > 0) {
      calculatedTaxes.push({
        taxRuleId: tax._id,
        name: tax.name,
        rate: tax.rate,
        type: tax.type,
        amount: Number(amount.toFixed(2))
      });
      totalTaxAmount += amount;
    }
  });

  // Calculate Charges
  charges.forEach(charge => {
    // Conditional logic
    if (charge.isConditional) {
      if (charge.conditionType === 'order_value' && charge.conditionValue) {
        if (subtotal < charge.conditionValue) {
          return; // skips applying this charge
        }
      } else if (charge.conditionType === 'guest_count' && charge.conditionValue) {
        const guests = orderData.guestCount || 1;
        if (guests < charge.conditionValue) {
          return; // skips applying this charge
        }
      } else if (charge.conditionType === 'time_of_day' && charge.conditionValue) {
        // Assume conditionValue is an hour e.g. 22 for 10 PM onwards
        const currentHour = orderData.timePlaced ? new Date(orderData.timePlaced).getHours() : new Date().getHours();
        if (currentHour < charge.conditionValue) {
          return; // skips applying this charge
        }
      }
    }

    let amount = 0;
    if (charge.type === 'percentage') {
      amount = subtotal * (charge.rate / 100);
    } else if (charge.type === 'fixed') {
      amount = charge.rate;
    }

    if (amount > 0) {
      calculatedCharges.push({
        chargeRuleId: charge._id,
        name: charge.name,
        rate: charge.rate,
        type: charge.type,
        amount: Number(amount.toFixed(2))
      });
      totalChargeAmount += amount;
    }
  });

  const grandTotal = subtotal + totalTaxAmount + totalChargeAmount;

  return {
    subtotal: Number(subtotal.toFixed(2)),
    taxes: calculatedTaxes,
    charges: calculatedCharges,
    totalTaxAmount: Number(totalTaxAmount.toFixed(2)),
    totalChargeAmount: Number(totalChargeAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2))
  };
};
