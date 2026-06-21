const Order = require('../models/Order.model');
const OrderStatusHistory = require('../models/OrderStatusHistory.model');
const MenuItem = require('../models/MenuItem.model');
const CustomizationGroup = require('../models/CustomizationGroup.model');
const CustomizationOption = require('../models/CustomizationOption.model');
const crypto = require('crypto');

/**
 * Generate a unique, short, human-readable order number
 * Format: HV-XXXXX (e.g. HV-A9F2B)
 */
exports.generateOrderNumber = async () => {
  let isUnique = false;
  let orderNumber;

  while (!isUnique) {
    const randomChars = crypto.randomBytes(3).toString('hex').toUpperCase().substring(0, 5);
    orderNumber = `HV-${randomChars}`;
    
    const existing = await Order.findOne({ orderNumber });
    if (!existing) {
      isUnique = true;
    }
  }

  return orderNumber;
};

/**
 * Validates that all items in the cart are available and prices match the database.
 * Prevents users from tampering with client-side pricing or ordering unavailable items.
 * @param {Array} cartItems 
 * @returns {Object} { isValid, errorMessage, validatedSubtotal }
 */
exports.validateItems = async (cartItems) => {
  let validatedSubtotal = 0;

  for (const item of cartItems) {
    const dbItem = await MenuItem.findById(item.menuItem._id).populate('customizationGroups');
    
    if (!dbItem) {
      return { isValid: false, errorMessage: `Item ${item.menuItem.name} no longer exists.` };
    }
    
    if (!dbItem.isAvailable) {
      return { isValid: false, errorMessage: `Item ${dbItem.name} is currently unavailable.` };
    }

    // Verify base price
    let itemTotal = dbItem.price;

    // Verify modifiers (Legacy)
    for (const mod of item.selectedModifiers || []) {
      const dbModGroup = dbItem.modifiers.find(m => 
        m.options.some(opt => opt.name === mod.name && opt.price === mod.price)
      );
      if (!dbModGroup) {
        return { isValid: false, errorMessage: `Invalid modifier ${mod.name} for item ${dbItem.name}` };
      }
      itemTotal += mod.price || 0;
    }

    // Verify addons (Legacy)
    for (const addon of item.selectedAddOns || []) {
      const dbAddon = dbItem.addOns.find(a => a.name === addon.name && a.price === addon.price);
      if (!dbAddon) {
        return { isValid: false, errorMessage: `Invalid add-on ${addon.name} for item ${dbItem.name}` };
      }
      itemTotal += addon.price || 0;
    }

    // Verify Customizations (New Architecture)
    if (item.customizationSelections && item.customizationSelections.length > 0) {
      const selectionsByGroup = {};
      
      for (const sel of item.customizationSelections) {
        const group = dbItem.customizationGroups.find(g => g.name === sel.groupName);
        if (!group) {
          return { isValid: false, errorMessage: `Invalid customization group ${sel.groupName} for item ${dbItem.name}` };
        }
        
        const dbOption = await CustomizationOption.findOne({ group: group._id, name: sel.optionName });
        if (!dbOption) {
          return { isValid: false, errorMessage: `Invalid option ${sel.optionName} for group ${group.name}` };
        }
        
        // Ensure price is exact float match
        if (Math.abs(dbOption.additionalPrice - sel.priceAdjustment) > 0.01) {
          return { isValid: false, errorMessage: `Price mismatch for option ${sel.optionName}` };
        }

        itemTotal += dbOption.additionalPrice;
        
        if (!selectionsByGroup[group._id]) {
          selectionsByGroup[group._id] = { group, count: 0 };
        }
        selectionsByGroup[group._id].count += 1;
      }
      
      // Validate Min/Max and Required
      for (const group of dbItem.customizationGroups) {
        const stats = selectionsByGroup[group._id] || { count: 0 };
        if (group.isRequired && stats.count === 0) {
          return { isValid: false, errorMessage: `Missing required selection for ${group.name}` };
        }
        if (group.minSelections > 0 && stats.count < group.minSelections) {
          return { isValid: false, errorMessage: `Please select at least ${group.minSelections} for ${group.name}` };
        }
        if (group.maxSelections && stats.count > group.maxSelections) {
          return { isValid: false, errorMessage: `Maximum selections exceeded for ${group.name}` };
        }
      }
    } else {
      // Validate required groups when no selections are provided
      if (dbItem.customizationGroups) {
        for (const group of dbItem.customizationGroups) {
          if (group.isRequired || group.minSelections > 0) {
            return { isValid: false, errorMessage: `Missing required selection for ${group.name}` };
          }
        }
      }
    }

    // Compare with client's itemTotal (allowing tiny float rounding differences)
    if (Math.abs(itemTotal - item.itemTotal) > 0.01) {
      return { isValid: false, errorMessage: `Price mismatch for item ${dbItem.name}. Expected ${itemTotal}, got ${item.itemTotal}` };
    }

    validatedSubtotal += (itemTotal * item.quantity);
  }

  return { isValid: true, validatedSubtotal };
};

/**
 * Validates if a status transition is allowed.
 * Order flow: new -> accepted -> preparing -> ready -> delivered
 * Any status -> cancelled (unless delivered)
 */
exports.isValidTransition = (currentStatus, newStatus) => {
  const allowedTransitions = {
    'new': ['accepted', 'cancelled'],
    'accepted': ['preparing', 'ready', 'cancelled'],
    'preparing': ['ready', 'cancelled'],
    'ready': ['delivered', 'cancelled'],
    'delivered': [], // Terminal state
    'cancelled': []  // Terminal state
  };

  return allowedTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Records a state change in the OrderStatusHistory collection (Append Only)
 */
exports.recordHistory = async (orderId, previousStatus, newStatus, changedBy, changedByType, note = '') => {
  try {
    await OrderStatusHistory.create({
      order: orderId,
      status: newStatus,       // Schema field is 'status', not 'newStatus'
      previousStatus,
      changedBy: changedBy || 'system',
      changedByType: changedByType || 'system',
      reason: note || undefined
    });
  } catch (err) {
    // Log but don't throw — history recording should never block order creation
    console.error('[OrderService] recordHistory error:', err.message);
  }
};
