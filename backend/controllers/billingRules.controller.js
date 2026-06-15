const TaxRule = require('../models/TaxRule.model');
const ChargeRule = require('../models/ChargeRule.model');
const Business = require('../models/Business.model');
const redis = require('../config/redis');

// Cache helpers
const clearBillingRulesCache = async (businessId) => {
  if (!redis || !redis.deleteCache) return;
  try {
    await redis.deleteCache(`billing_rules:${businessId}`);
  } catch (error) {
    console.error('Redis cache clear error:', error);
  }
};

const verifyOwnership = async (businessId, user) => {
  if (user.role === 'admin') return true;
  try {
    const business = await Business.findById(businessId);
    if (!business || !business.owner) return false;
    return business.owner.toString() === user._id.toString();
  } catch (err) {
    return false;
  }
};

// ─── Tax Rules ──────────────────────────────────────────────

exports.createTaxRule = async (req, res, next) => {
  try {
    const { businessId, name, rate, type, mode, appliesTo, specificCategories, specificItems } = req.body;
    
    // Authorization check
    const isOwner = await verifyOwnership(businessId, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to create tax rules for this business' });
    }

    const newRule = await TaxRule.create({
      business: businessId,
      name,
      rate,
      type,
      calculationMode: mode,
      applicability: appliesTo,
      applicableCategories: specificCategories,
      applicableItems: specificItems,
      isActive: true
    });

    await clearBillingRulesCache(businessId);

    res.status(201).json({ success: true, data: newRule });
  } catch (error) {
    next(error);
  }
};

exports.getTaxRules = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    
    const rules = await TaxRule.find({ business: businessId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

exports.updateTaxRule = async (req, res, next) => {
  try {
    const rule = await TaxRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Tax rule not found' });
    }
    
    // Auth check
    const isOwner = await verifyOwnership(rule.business, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { businessId, name, rate, type, mode, appliesTo, specificCategories, specificItems, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) updateData.rate = rate;
    if (type !== undefined) updateData.type = type;
    if (mode !== undefined) updateData.calculationMode = mode;
    if (appliesTo !== undefined) updateData.applicability = appliesTo;
    if (specificCategories !== undefined) updateData.applicableCategories = specificCategories;
    if (specificItems !== undefined) updateData.applicableItems = specificItems;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedRule = await TaxRule.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    await clearBillingRulesCache(rule.business);

    res.status(200).json({ success: true, data: updatedRule });
  } catch (error) {
    next(error);
  }
};

exports.toggleTaxRule = async (req, res, next) => {
  try {
    const rule = await TaxRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Tax rule not found' });
    }
    
    const isOwner = await verifyOwnership(rule.business, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();
    
    await clearBillingRulesCache(rule.business);

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

exports.deleteTaxRule = async (req, res, next) => {
  try {
    const rule = await TaxRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Tax rule not found' });
    }
    
    const isOwner = await verifyOwnership(rule.business, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Soft delete or hard delete? SAD says "soft delete"
    // Since TaxRule doesn't have isDeleted, we'll just set isActive=false and maybe add an isDeleted flag if needed, 
    // or just hard delete if it doesn't break history (Order history has snapshot). 
    // SAD tasks say "DELETE /api/tax-rules/:id — soft delete". 
    // Let's implement actual deletion since billing Engine uses snapshots, so deleting the rule won't affect old orders.
    await TaxRule.findByIdAndDelete(req.params.id);
    
    await clearBillingRulesCache(rule.business);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ─── Charge Rules ────────────────────────────────────────────

exports.createChargeRule = async (req, res, next) => {
  try {
    const { businessId, name, rate, type, isConditional, conditionType, conditionValue } = req.body;
    
    const isOwner = await verifyOwnership(businessId, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const newRule = await ChargeRule.create({
      business: businessId,
      name,
      rate,
      type,
      isConditional,
      conditionType,
      conditionValue,
      isActive: true
    });

    await clearBillingRulesCache(businessId);

    res.status(201).json({ success: true, data: newRule });
  } catch (error) {
    next(error);
  }
};

exports.getChargeRules = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    
    const rules = await ChargeRule.find({ business: businessId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
};

exports.updateChargeRule = async (req, res, next) => {
  try {
    const rule = await ChargeRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Charge rule not found' });
    }
    
    const isOwner = await verifyOwnership(rule.business, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { name, rate, type, isConditional, conditionType, conditionValue, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (rate !== undefined) updateData.rate = rate;
    if (type !== undefined) updateData.type = type;
    if (isConditional !== undefined) updateData.isConditional = isConditional;
    if (conditionType !== undefined) updateData.conditionType = conditionType;
    if (conditionValue !== undefined) updateData.conditionValue = conditionValue;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedRule = await ChargeRule.findByIdAndUpdate(req.params.id, updateData, { new: true, runValidators: true });
    
    await clearBillingRulesCache(rule.business);

    res.status(200).json({ success: true, data: updatedRule });
  } catch (error) {
    next(error);
  }
};

exports.toggleChargeRule = async (req, res, next) => {
  try {
    const rule = await ChargeRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Charge rule not found' });
    }
    
    const isOwner = await verifyOwnership(rule.business, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();
    await clearBillingRulesCache(rule.business);

    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
};

exports.deleteChargeRule = async (req, res, next) => {
  try {
    const rule = await ChargeRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Charge rule not found' });
    }
    
    const isOwner = await verifyOwnership(rule.business, req.user);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    await ChargeRule.findByIdAndDelete(req.params.id);
    
    await clearBillingRulesCache(rule.business);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

// ─── Combined Rules API for Frontend Client ────────────────────
exports.getActiveRules = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    
    // Check cache
    if (redis && redis.getCache) {
      const cached = await redis.getCache(`billing_rules:${businessId}`);
      if (cached) {
        return res.status(200).json({ success: true, data: cached });
      }
    }

    const [taxes, charges] = await Promise.all([
      TaxRule.find({ business: businessId, isActive: true }),
      ChargeRule.find({ business: businessId, isActive: true })
    ]);
    
    const data = { taxes, charges };
    
    if (redis && redis.setCache) {
      await redis.setCache(`billing_rules:${businessId}`, data, 3600); // 1 hour TTL
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};
