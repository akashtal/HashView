const MenuItem = require('../models/MenuItem.model');
const Business = require('../models/Business.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const { cloudinary } = require('../config/cloudinary');
const { getCache, setCache, deleteCachePattern } = require('../config/redis');
const CustomizationOption = require('../models/CustomizationOption.model');

const CircuitBreaker = require('../utils/circuitBreaker');
const cloudinaryBreaker = new CircuitBreaker('Cloudinary Upload', 5, 30000);

// Helper: upload a buffer to Cloudinary (since the existing multer pipeline uses disk
// storage in some places, we use the stream API for buffer uploads)
const uploadBufferToCloudinary = (buffer, options) => {
  return cloudinaryBreaker.execute(() => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
      stream.end(buffer);
    });
  });
};

// ─── Helper: verify that the requesting user owns the given business ──────────
const verifyBusinessOwnership = async (businessId, user) => {
  const business = await Business.findById(businessId);
  if (!business) return { error: 'Business not found', status: 404 };

  // Admin can manage any business
  if (user.role === 'admin') return { business };

  // Business owners must own the specific business
  const ownerId = business.owner ? business.owner.toString() : null;
  const userId = user._id.toString();

  if (!ownerId || ownerId !== userId) {
    return { error: 'You do not own this business', status: 403 };
  }

  return { business };
};

// ─── GET /api/menu-items/business/:businessId ─────────────────────────────────
// Public. Returns all active menu items for a business, grouped by menuCategory.
exports.getMenuItems = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { type, status } = req.query;

    const filter = {
      business: businessId,
      status: status === 'all' && req.user?.role === 'admin' ? undefined : 'active'
    };

    // Remove undefined keys so Mongoose doesn't filter on them
    if (!filter.status) delete filter.status;

    // Optional type filter (e.g. ?type=food)
    if (type && ['food', 'drink', 'service', 'product', 'package', 'room'].includes(type)) {
      filter.type = type;
    }

    const items = await MenuItem.find(filter)
      .populate('customizationGroups')
      .sort({ menuCategory: 1, sortOrder: 1, name: 1 })
      .lean();

    // Hydrate options
    const groupIds = [];
    items.forEach(item => {
      if (item.customizationGroups) {
        item.customizationGroups.forEach(g => {
          if (g && g._id) groupIds.push(g._id);
        });
      }
    });

    if (groupIds.length > 0) {
      const options = await CustomizationOption.find({ group: { $in: groupIds }, isActive: true }).sort({ sortOrder: 1 }).lean();
      const optionsByGroup = {};
      options.forEach(opt => {
        const gid = opt.group.toString();
        if (!optionsByGroup[gid]) optionsByGroup[gid] = [];
        optionsByGroup[gid].push(opt);
      });
      items.forEach(item => {
        if (item.customizationGroups) {
          item.customizationGroups.forEach(g => {
            if (g && g._id) g.options = optionsByGroup[g._id.toString()] || [];
          });
        }
      });
    }

    // Group by menuCategory for the UI
    const grouped = {};
    items.forEach(item => {
      const cat = item.menuCategory || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    res.status(200).json({
      success: true,
      count: items.length,
      data: grouped
    });
  } catch (error) {
    console.error('getMenuItems error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching menu items' });
  }
};

// ─── GET /api/menu-items/business/:businessId/flat ────────────────────────────
// Public. Returns flat (un-grouped) array — used by AI Gateway for search queries.
exports.getMenuItemsFlat = async (req, res) => {
  try {
    const { businessId } = req.params;

    const items = await MenuItem.find({ business: businessId, status: 'active' })
      .sort({ menuCategory: 1, sortOrder: 1 })
      .lean();

    res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('getMenuItemsFlat error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── GET /api/menu-items/business/:businessId/ordering ─────────────────────────
// Public. Returns active items grouped by category, optimized for the QR ordering flow.
// Uses Redis caching with a 5-minute TTL.
exports.getOrderingMenu = async (req, res) => {
  try {
    const { businessId } = req.params;
    const cacheKey = `menu:ordering:${businessId}`;

    // 1. Check Cache
    const cachedData = await getCache(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        source: 'cache',
        count: cachedData.count,
        data: cachedData.data
      });
    }

    // 2. Fetch from DB
    const items = await MenuItem.find({ business: businessId, status: 'active', isAvailable: true })
      .populate({
        path: 'customizationGroups',
        match: { isActive: true }
      })
      .sort({ menuCategory: 1, sortOrder: 1, name: 1 })
      .lean();

    // Hydrate options
    const groupIds = [];
    items.forEach(item => {
      if (item.customizationGroups) {
        item.customizationGroups.forEach(g => {
          if (g && g._id) groupIds.push(g._id);
        });
      }
    });

    if (groupIds.length > 0) {
      const options = await CustomizationOption.find({ group: { $in: groupIds }, isActive: true }).sort({ sortOrder: 1 }).lean();
      const optionsByGroup = {};
      options.forEach(opt => {
        const gid = opt.group.toString();
        if (!optionsByGroup[gid]) optionsByGroup[gid] = [];
        optionsByGroup[gid].push(opt);
      });
      items.forEach(item => {
        if (item.customizationGroups) {
          item.customizationGroups.forEach(g => {
            if (g && g._id) g.options = optionsByGroup[g._id.toString()] || [];
          });
        }
      });
    }

    // 3. Group by menuCategory
    const grouped = {};
    let itemCount = 0;
    
    items.forEach(item => {
      const cat = item.menuCategory || 'General';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
      itemCount++;
    });

    const responseData = {
      count: itemCount,
      data: grouped
    };

    // 4. Save to Cache (300 seconds = 5 minutes)
    await setCache(cacheKey, responseData, 300);

    res.status(200).json({
      success: true,
      source: 'database',
      ...responseData
    });
  } catch (error) {
    console.error('getOrderingMenu error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching ordering menu' });
  }
};

// ─── POST /api/menu-items ─────────────────────────────────────────────────────
// Protected (business owner or admin). Creates a new menu/service item.
exports.createMenuItem = async (req, res) => {
  try {
    const {
      businessId, name, description, price, currency,
      menuCategory, type, tags, dietary,
      isAvailable, availableDays, availableTimeSlots,
      isPopular, isFeatured, sortOrder, duration,
      modifiers, addOns, prepTime, maxOrdersPerSlot, allergens, calories
    } = req.body;

    // Verify ownership
    const { business, error, status } = await verifyBusinessOwnership(businessId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    // Handle optional image upload
    let image = null;
    if (req.file) {
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
        folder: `hashview/menus/${businessId}`,
        transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto' }]
      });
      image = { url: uploaded.secure_url, publicId: uploaded.public_id };
    }

    // Parse tags and dietary arrays (may come as JSON-stringified arrays or comma-separated strings from form-data)
    const parseTags = (val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val.map(t => t.trim().toLowerCase()).filter(Boolean);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.map(t => t.trim().toLowerCase()).filter(Boolean);
            }
          } catch (e) {
            // fallback if JSON parsing fails
          }
        }
        return trimmed.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }
      return [];
    };

    const parseJSONField = (val) => {
      if (!val) return undefined;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return undefined; }
      }
      return val;
    };

    const menuItem = await MenuItem.create({
      business: businessId,
      name: name.trim(),
      description: description?.trim(),
      price: parseFloat(price),
      currency: currency || 'GBP',
      menuCategory: menuCategory?.trim(),
      type: type || 'food',
      tags: parseTags(tags),
      dietary: parseTags(dietary),
      isAvailable: isAvailable !== false && isAvailable !== 'false',
      availableDays: Array.isArray(availableDays) ? availableDays : [],
      availableTimeSlots: Array.isArray(availableTimeSlots) ? availableTimeSlots : [],
      image,
      isPopular: isPopular === true || isPopular === 'true',
      isFeatured: isFeatured === true || isFeatured === 'true',
      sortOrder: parseInt(sortOrder) || 0,
      duration: duration ? parseInt(duration) : undefined,
      modifiers: parseJSONField(modifiers),
      addOns: parseJSONField(addOns),
      prepTime: prepTime ? parseInt(prepTime) : 15,
      maxOrdersPerSlot: maxOrdersPerSlot ? parseInt(maxOrdersPerSlot) : null,
      allergens: parseTags(allergens),
      calories: calories ? parseInt(calories) : null
    });

    // Invalidate ordering menu cache
    await deleteCachePattern(`menu:ordering:${businessId}*`);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });
  } catch (error) {
    console.error('createMenuItem error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Server error creating menu item' });
  }
};

// ─── PUT /api/menu-items/:id ──────────────────────────────────────────────────
// Protected (business owner or admin). Updates a menu item.
exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    // Verify ownership via the item's business
    const { error, status } = await verifyBusinessOwnership(menuItem.business, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    const {
      name, description, price, currency, menuCategory, type,
      tags, dietary, isAvailable, availableDays, availableTimeSlots,
      isPopular, isFeatured, sortOrder, duration,
      modifiers, addOns, prepTime, maxOrdersPerSlot, allergens, calories
    } = req.body;

    // Handle image replacement
    if (req.file) {
      // Delete old image from Cloudinary if it exists
      if (menuItem.image?.publicId) {
        await cloudinary.uploader.destroy(menuItem.image.publicId).catch(err =>
          console.warn('Could not delete old menu image:', err.message)
        );
      }
      const uploaded = await uploadBufferToCloudinary(req.file.buffer, {
        folder: `hashview/menus/${menuItem.business}`,
        transformation: [{ width: 800, height: 600, crop: 'fill', quality: 'auto' }]
      });
      menuItem.image = { url: uploaded.secure_url, publicId: uploaded.public_id };
    }

    // Parse tags and dietary arrays (may come as JSON-stringified arrays or comma-separated strings from form-data)
    const parseTags = (val) => {
      if (!val) return undefined;
      if (Array.isArray(val)) return val.map(t => t.trim().toLowerCase()).filter(Boolean);
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed.map(t => t.trim().toLowerCase()).filter(Boolean);
            }
          } catch (e) {
            // fallback if JSON parsing fails
          }
        }
        return trimmed.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      }
      return undefined;
    };

    const parseJSONField = (val) => {
      if (val === undefined) return undefined;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch (e) { return undefined; }
      }
      return val;
    };

    // Only update fields that were provided
    if (name !== undefined) menuItem.name = name.trim();
    if (description !== undefined) menuItem.description = description.trim();
    if (price !== undefined) menuItem.price = parseFloat(price);
    if (currency !== undefined) menuItem.currency = currency;
    if (menuCategory !== undefined) menuItem.menuCategory = menuCategory.trim();
    if (type !== undefined) menuItem.type = type;
    if (tags !== undefined) menuItem.tags = parseTags(tags);
    if (dietary !== undefined) menuItem.dietary = parseTags(dietary);
    const previousAvailability = menuItem.isAvailable;
    if (isAvailable !== undefined) menuItem.isAvailable = isAvailable !== false && isAvailable !== 'false';
    if (availableDays !== undefined) menuItem.availableDays = Array.isArray(availableDays) ? availableDays : [];
    if (availableTimeSlots !== undefined) menuItem.availableTimeSlots = Array.isArray(availableTimeSlots) ? availableTimeSlots : [];
    if (isPopular !== undefined) menuItem.isPopular = isPopular === true || isPopular === 'true';
    if (isFeatured !== undefined) menuItem.isFeatured = isFeatured === true || isFeatured === 'true';
    if (sortOrder !== undefined) menuItem.sortOrder = parseInt(sortOrder) || 0;
    if (duration !== undefined) menuItem.duration = duration ? parseInt(duration) : undefined;
    if (modifiers !== undefined) menuItem.modifiers = parseJSONField(modifiers);
    if (addOns !== undefined) menuItem.addOns = parseJSONField(addOns);
    if (prepTime !== undefined) menuItem.prepTime = parseInt(prepTime);
    if (maxOrdersPerSlot !== undefined) menuItem.maxOrdersPerSlot = parseInt(maxOrdersPerSlot) || null;
    if (allergens !== undefined) menuItem.allergens = parseTags(allergens);
    if (calories !== undefined) menuItem.calories = parseInt(calories) || null;

    await menuItem.save();

    // Invalidate ordering menu cache
    await deleteCachePattern(`menu:ordering:${menuItem.business.toString()}*`);

    // Emit Real-Time Socket Event if item becomes unavailable
    if (previousAvailability === true && menuItem.isAvailable === false) {
      const orderSocket = require('../sockets/order.socket');
      orderSocket.getIo()?.of('/orders').to(`business_${menuItem.business.toString()}`).emit('menu.item_unavailable', {
        menuItemId: menuItem._id,
        name: menuItem.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error) {
    console.error('updateMenuItem error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: 'Server error updating menu item' });
  }
};

// ─── DELETE /api/menu-items/:id ───────────────────────────────────────────────
// Protected (business owner or admin). Deletes a menu item.
exports.deleteMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const { error, status } = await verifyBusinessOwnership(menuItem.business, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    // Delete image from Cloudinary
    if (menuItem.image?.publicId) {
      await cloudinary.uploader.destroy(menuItem.image.publicId).catch(err =>
        console.warn('Could not delete menu image:', err.message)
      );
    }

    await menuItem.deleteOne();

    // Invalidate ordering menu cache
    await deleteCachePattern(`menu:ordering:${menuItem.business.toString()}*`);

    res.status(200).json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('deleteMenuItem error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting menu item' });
  }
};

// ─── PATCH /api/menu-items/:id/toggle ────────────────────────────────────────
// Protected. Toggles isAvailable on/off quickly (without opening the edit form).
exports.toggleAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const { error, status } = await verifyBusinessOwnership(menuItem.business, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    // Invalidate ordering menu cache
    await deleteCachePattern(`menu:ordering:${menuItem.business.toString()}*`);

    res.status(200).json({
      success: true,
      message: `Menu item marked as ${menuItem.isAvailable ? 'available' : 'unavailable'}`,
      data: { id: menuItem._id, isAvailable: menuItem.isAvailable }
    });
  } catch (error) {
    console.error('toggleAvailability error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── PUT /api/menu-items/reorder ─────────────────────────────────────────────
// Protected. Batch updates sortOrder for multiple items (drag-to-reorder in UI).
// Body: { businessId: "...", items: [{ id: "...", sortOrder: 0 }, ...] }
exports.reorderMenuItems = async (req, res) => {
  try {
    const { businessId, items } = req.body;

    if (!businessId || !Array.isArray(items)) {
      return res.status(400).json({ success: false, message: 'businessId and items array required' });
    }

    const { error, status } = await verifyBusinessOwnership(businessId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    // Bulk write for efficiency
    const bulkOps = items.map(({ id, sortOrder }) => ({
      updateOne: {
        filter: { _id: id, business: businessId },
        update: { $set: { sortOrder: parseInt(sortOrder) || 0 } }
      }
    }));

    await MenuItem.bulkWrite(bulkOps);

    // Invalidate ordering menu cache
    await deleteCachePattern(`menu:ordering:${businessId}*`);

    res.status(200).json({
      success: true,
      message: `Reordered ${items.length} menu items`
    });
  } catch (error) {
    console.error('reorderMenuItems error:', error);
    res.status(500).json({ success: false, message: 'Server error reordering menu items' });
  }
};

// ─── GET /api/menu-items/business/:businessId/stats ──────────────────────────
// Protected (business owner or admin). Returns quick stats for the dashboard header.
exports.getMenuStats = async (req, res) => {
  try {
    const { businessId } = req.params;

    const { error, status } = await verifyBusinessOwnership(businessId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    const [total, active, popular, priceRange] = await Promise.all([
      MenuItem.countDocuments({ business: businessId }),
      MenuItem.countDocuments({ business: businessId, status: 'active' }),
      MenuItem.countDocuments({ business: businessId, isPopular: true, status: 'active' }),
      MenuItem.aggregate([
        { $match: { business: new (require('mongoose').Types.ObjectId)(businessId), status: 'active' } },
        { $group: { _id: null, minPrice: { $min: '$price' }, maxPrice: { $max: '$price' } } }
      ])
    ]);

    res.status(200).json({
      success: true,
      data: {
        total,
        active,
        inactive: total - active,
        popular,
        priceRange: priceRange[0]
          ? { min: priceRange[0].minPrice, max: priceRange[0].maxPrice }
          : null
      }
    });
  } catch (error) {
    console.error('getMenuStats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// ─── POST /api/menu-items/extract-ai ────────────────────────────────────────────────────
// Protected (business owner or admin).
// Accepts a menu image upload, sends it to the AI router for vision extraction,
// and returns an array of structured draft items for user review.
// The items are NOT saved to the DB at this stage — they are returned to the
// frontend for the user to review/edit before calling /batch.
exports.extractMenuAI = async (req, res) => {
  try {
    const { businessId, currency } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Menu image is required' });
    }

    // Verify ownership before doing any AI work
    const { error, status } = await verifyBusinessOwnership(businessId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    // Convert uploaded buffer to base64 for the vision API
    const imageBase64 = req.file.buffer.toString('base64');
    const mimeType = req.file.mimetype || 'image/jpeg';
    const resolvedCurrency = (currency || 'GBP').toUpperCase();

    // Call the AI router — handles provider failover automatically
    const { getRouter } = require('../ai-gateway/providers/router');
    const router = getRouter();

    const items = await router.extractMenuFromImage(imageBase64, {
      mimeType,
      currency: resolvedCurrency,
    });

    if (!items || items.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'No menu items could be extracted from this image. Please ensure the image is clear and contains menu text.'
      });
    }

    res.status(200).json({
      success: true,
      count: items.length,
      message: `Extracted ${items.length} item${items.length !== 1 ? 's' : ''} from your menu image. Review and save below.`,
      data: items,
    });
  } catch (error) {
    console.error('extractMenuAI error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to extract menu from image. Please try again.'
    });
  }
};

// ─── POST /api/menu-items/batch ──────────────────────────────────────────────────────────
// Protected (business owner or admin).
// Accepts a pre-reviewed array of menu item drafts and bulk-inserts them.
// Body: { businessId: "...", items: [{...}, ...], skipDuplicates: true }
exports.createMenuItemsBatch = async (req, res) => {
  try {
    const { businessId, items, skipDuplicates } = req.body;

    if (!businessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required and must not be empty' });
    }
    if (items.length > 100) {
      return res.status(400).json({ success: false, message: 'Maximum 100 items per batch' });
    }

    // Verify ownership
    const { error, status } = await verifyBusinessOwnership(businessId, req.user);
    if (error) return res.status(status).json({ success: false, message: error });

    const ALLOWED_TYPES   = ['food', 'drink', 'service', 'product', 'room', 'package'];
    const ALLOWED_DIETARY = ['vegetarian', 'vegan', 'halal', 'gluten-free', 'dairy-free', 'nut-free', 'kosher', 'organic'];

    // Validate and sanitise each item
    const docs = items.map((item, idx) => {
      if (!item.name || typeof item.name !== 'string' || !item.name.trim()) {
        throw new Error(`Item at index ${idx} is missing a valid name`);
      }
      return {
        business:     businessId,
        name:         item.name.trim(),
        description:  (item.description || '').trim(),
        price:        Math.max(0, parseFloat(item.price) || 0),
        currency:     (item.currency || 'GBP').toUpperCase(),
        menuCategory: (item.menuCategory || 'General').trim(),
        type:         ALLOWED_TYPES.includes(item.type) ? item.type : 'food',
        dietary:      Array.isArray(item.dietary) ? item.dietary.filter(d => ALLOWED_DIETARY.includes(d)) : [],
        tags:         Array.isArray(item.tags) ? item.tags.slice(0, 5).map(t => String(t).toLowerCase().trim()) : [],
        isPopular:    Boolean(item.isPopular),
        isAvailable:  item.isAvailable !== false,
        status:       'active',
      };
    });

    let created;
    if (skipDuplicates) {
      // Insert and ignore duplicate name+business collisions
      created = await MenuItem.insertMany(docs, { ordered: false }).catch(err => {
        // MongoDB bulk write errors — some may succeed even if others fail
        if (err.insertedDocs) return err.insertedDocs;
        throw err;
      });
    } else {
      created = await MenuItem.insertMany(docs, { ordered: true });
    }

    // Invalidate ordering menu cache
    await deleteCachePattern(`menu:ordering:${businessId}*`);

    res.status(201).json({
      success: true,
      count: created.length,
      message: `Successfully added ${created.length} item${created.length !== 1 ? 's' : ''} to your menu.`,
      data: created,
    });
  } catch (error) {
    console.error('createMenuItemsBatch error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join('. ') });
    }
    res.status(500).json({ success: false, message: error.message || 'Server error during batch creation' });
  }
};
