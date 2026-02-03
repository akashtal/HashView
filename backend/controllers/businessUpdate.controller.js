const BusinessUpdate = require('../models/BusinessUpdate.model');
const Business = require('../models/Business.model');
const User = require('../models/User.model');
const { sendBulkNotifications } = require('../utils/notification');

// @desc    Get all updates/offers for a business
// @route   GET /api/business/:businessId/updates
// @access  Public
exports.getBusinessUpdates = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { type } = req.query; // Filter by type: 'offer', 'update', 'announcement'

    const query = {
      business: businessId,
      isActive: true
    };

    if (type) {
      query.type = type;
    }

    const updates = await BusinessUpdate.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: updates.length,
      updates
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create update/offer (Business owner only)
// @route   POST /api/business/:businessId/updates
// @access  Private (Business owner)
exports.createBusinessUpdate = async (req, res, next) => {
  try {
    const { businessId } = req.params;
    const { type, title, description, image, discountType, discountValue, validUntil } = req.body;

    // Verify business ownership
    const business = await Business.findById(businessId);
    if (!business) {
      return res.status(404).json({
        success: false,
        message: 'Business not found'
      });
    }

    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add updates for this business'
      });
    }

    const update = await BusinessUpdate.create({
      business: businessId,
      type,
      title,
      description,
      image,
      discountType,
      discountValue,
      validUntil,
      createdBy: req.user.id
    });

    // Send push notification for announcements and offers
    if (type === 'announcement' || type === 'offer') {
      try {
        // Create notification title and message
        let notificationTitle = `📢 ${business.name}`;
        let notificationMessage = title;

        if (type === 'offer' && discountValue > 0) {
          const discountText = discountType === 'percentage'
            ? `${discountValue}% OFF`
            : `₹${discountValue} OFF`;
          notificationMessage = `${discountText} - ${title}`;
        }

        // Send to users who have favorited this business
        // Find users who have favorited this business
        console.log(`📊 Searching for users who favorited business ${businessId}...`);
        const users = await User.find({ favoritePlaces: businessId }).select('_id');
        console.log(`📊 Found ${users.length} users to notify`);

        if (users.length > 0) {
          const userIds = users.map(user => user._id);

          await sendBulkNotifications(
            userIds,
            notificationTitle,
            notificationMessage,
            {
              type: 'business_update',
              businessId: businessId.toString(),
              updateId: update._id.toString(),
              screen: 'BusinessDetail' // For frontend navigation
            }
          );
          console.log(`✅ Push notification sent for business ${type}: ${business.name} to ${users.length} users`);
        } else {
          console.log(`⚠️ No users found to notify for business ${businessId}`);
        }
      } catch (error) {
        console.error('❌ Failed to send push notification for business update:', error);
        // Don't fail the request if notification fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Update created successfully',
      update
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update business update/offer
// @route   PUT /api/business/updates/:updateId
// @access  Private (Business owner)
exports.updateBusinessUpdate = async (req, res, next) => {
  try {
    let update = await BusinessUpdate.findById(req.params.updateId);

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }

    // Verify ownership
    const business = await Business.findById(update.business);
    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const { title, description, image, discountType, discountValue, validUntil, isActive } = req.body;

    if (title) update.title = title;
    if (description) update.description = description;
    if (image) update.image = image;
    if (discountType) update.discountType = discountType;
    if (discountValue !== undefined) update.discountValue = discountValue;
    if (validUntil) update.validUntil = validUntil;
    if (isActive !== undefined) update.isActive = isActive;

    await update.save();

    res.status(200).json({
      success: true,
      message: 'Update updated successfully',
      update
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete business update/offer
// @route   DELETE /api/business/updates/:updateId
// @access  Private (Business owner)
exports.deleteBusinessUpdate = async (req, res, next) => {
  try {
    const update = await BusinessUpdate.findById(req.params.updateId);

    if (!update) {
      return res.status(404).json({
        success: false,
        message: 'Update not found'
      });
    }

    // Verify ownership
    const business = await Business.findById(update.business);
    if (business.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await update.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Update deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
