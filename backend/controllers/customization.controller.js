const CustomizationGroup = require('../models/CustomizationGroup.model');
const CustomizationOption = require('../models/CustomizationOption.model');
const MenuItem = require('../models/MenuItem.model');
const { deleteCachePattern } = require('../config/redis');


async function clearMenuCacheForGroup(groupId) {
  try {
    const group = await CustomizationGroup.findById(groupId);
    if (group && group.business) {
      await deleteCachePattern(`menu:ordering:${group.business.toString()}*`);
    }
  } catch (error) {
    console.error('Error clearing menu cache:', error);
  }
}

async function clearMenuCacheForBusiness(businessId) {
  try {
    if (businessId) {
      await deleteCachePattern(`menu:ordering:${businessId.toString()}*`);
    }
  } catch (error) {
    console.error('Error clearing menu cache:', error);
  }
}

// ─── Customization Groups ───────────────────────────────────────────────────────

exports.createGroup = async (req, res) => {
  try {
    const { name, selectionType, isRequired, minSelections, maxSelections, sortOrder, isActive, businessId, menuItemId, menuItem } = req.body;
    
    // Support either menuItem or menuItemId from frontend
    const targetMenuItemId = menuItemId || menuItem;
    let targetBusinessId = businessId;

    // Auto-resolve businessId from the MenuItem if not explicitly provided
    if (!targetBusinessId && targetMenuItemId) {
      const item = await MenuItem.findById(targetMenuItemId);
      if (item) {
        targetBusinessId = item.business;
      }
    }

    if (!targetBusinessId) {
      return res.status(400).json({ success: false, message: 'businessId is required' });
    }
    
    const group = await CustomizationGroup.create({
      business: targetBusinessId,
      name,
      selectionType,
      isRequired,
      minSelections,
      maxSelections,
      sortOrder,
      isActive
    });

    if (targetMenuItemId) {
      await MenuItem.findByIdAndUpdate(targetMenuItemId, {
        $push: { customizationGroups: group._id }
      });
    }

    await clearMenuCacheForBusiness(targetBusinessId);
    res.status(201).json({ success: true, data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getGroupsByMenuItem = async (req, res) => {
  try {
    const { menuItemId } = req.params;
    const menuItem = await MenuItem.findById(menuItemId).populate({
      path: 'customizationGroups'
    });
    
    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'MenuItem not found' });
    }

    // Ensure we return the populated groups, properly sorted
    let groups = menuItem.customizationGroups || [];
    groups = groups.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)).map(g => g.toObject());

    // Fetch options for these groups
    const groupIds = groups.map(g => g._id);
    const options = await CustomizationOption.find({ group: { $in: groupIds } }).sort({ sortOrder: 1 });

    // Attach options to their respective groups
    groups.forEach(group => {
      group.options = options.filter(opt => opt.group.toString() === group._id.toString());
    });

    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getGroupsByBusiness = async (req, res) => {
  try {
    const { businessId } = req.params;
    const groups = await CustomizationGroup.find({ business: businessId }).sort({ sortOrder: 1 });
    res.status(200).json({ success: true, data: groups });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await CustomizationGroup.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    await clearMenuCacheForBusiness(group.business);
    res.status(200).json({ success: true, data: group });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await CustomizationGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    // Remove from any menu items
    await MenuItem.updateMany(
      { customizationGroups: group._id },
      { $pull: { customizationGroups: group._id } }
    );
    
    // Delete associated options
    await CustomizationOption.deleteMany({ group: group._id });
    
    // Delete group
    const businessId = group.business;
    await group.remove();
    await clearMenuCacheForBusiness(businessId);

    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.cloneGroup = async (req, res) => {
  try {
    const group = await CustomizationGroup.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const newGroup = await CustomizationGroup.create({
      business: group.business,
      name: `${group.name} (Copy)`,
      selectionType: group.selectionType,
      isRequired: group.isRequired,
      minSelections: group.minSelections,
      maxSelections: group.maxSelections,
      sortOrder: group.sortOrder + 1,
      isActive: group.isActive
    });

    const options = await CustomizationOption.find({ group: group._id });
    if (options.length > 0) {
      const newOptions = options.map(opt => ({
        group: newGroup._id,
        name: opt.name,
        additionalPrice: opt.additionalPrice,
        description: opt.description,
        isActive: opt.isActive,
        sortOrder: opt.sortOrder,
        isDefault: opt.isDefault
      }));
      await CustomizationOption.insertMany(newOptions);
    }

    await clearMenuCacheForBusiness(newGroup.business);
    res.status(201).json({ success: true, data: newGroup });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.reorderGroups = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      await CustomizationGroup.findByIdAndUpdate(orderedIds[i], { sortOrder: i });
    }
    if (orderedIds.length > 0) {
      await clearMenuCacheForGroup(orderedIds[0]);
    }
    res.status(200).json({ success: true, message: 'Groups reordered successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ─── Customization Options ──────────────────────────────────────────────────────

exports.createOption = async (req, res) => {
  try {
    if (req.body.groupId && !req.body.group) req.body.group = req.body.groupId; const option = await CustomizationOption.create(req.body);
    await clearMenuCacheForGroup(option.group);
    res.status(201).json({ success: true, data: option });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.getOptionsByGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const options = await CustomizationOption.find({ group: groupId }).sort({ sortOrder: 1 });
    res.status(200).json({ success: true, data: options });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateOption = async (req, res) => {
  try {
    const option = await CustomizationOption.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });
    await clearMenuCacheForGroup(option.group);
    res.status(200).json({ success: true, data: option });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.deleteOption = async (req, res) => {
  try {
    const option = await CustomizationOption.findById(req.params.id);
    if (!option) return res.status(404).json({ success: false, message: 'Option not found' });
    const groupId = option.group;
    await option.remove();
    await clearMenuCacheForGroup(groupId);
    res.status(200).json({ success: true, data: {} });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.reorderOptions = async (req, res) => {
  try {
    const { orderedIds } = req.body;
    for (let i = 0; i < orderedIds.length; i++) {
      await CustomizationOption.findByIdAndUpdate(orderedIds[i], { sortOrder: i });
    }
    if (orderedIds.length > 0) {
      const firstOpt = await CustomizationOption.findById(orderedIds[0]);
      if (firstOpt) await clearMenuCacheForGroup(firstOpt.group);
    }
    res.status(200).json({ success: true, message: 'Options reordered successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
