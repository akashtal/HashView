const express = require('express');
const router = express.Router();
const {
  createGroup,
  getGroupsByBusiness,
  updateGroup,
  deleteGroup,
  cloneGroup,
  reorderGroups,
  createOption,
  getOptionsByGroup,
  updateOption,
  deleteOption,
  reorderOptions
} = require('../controllers/customization.controller');

const { protect, authorize } = require('../middleware/auth.middleware');

// ─── Customization Groups ───────────────────────────────────────────────────────

router.route('/groups')
  .post(protect, authorize('business', 'admin'), createGroup);

router.route('/groups/business/:businessId')
  .get(getGroupsByBusiness);

router.route('/groups/menu-item/:menuItemId')
  .get(require('../controllers/customization.controller').getGroupsByMenuItem);

router.route('/groups/reorder')
  .put(protect, authorize('business', 'admin'), reorderGroups);

router.route('/groups/:id')
  .put(protect, authorize('business', 'admin'), updateGroup)
  .delete(protect, authorize('business', 'admin'), deleteGroup);

router.route('/groups/:id/clone')
  .post(protect, authorize('business', 'admin'), cloneGroup);

// ─── Customization Options ──────────────────────────────────────────────────────

router.route('/options')
  .post(protect, authorize('business', 'admin'), createOption);

router.route('/options/group/:groupId')
  .get(getOptionsByGroup);

router.route('/options/reorder')
  .put(protect, authorize('business', 'admin'), reorderOptions);

router.route('/options/:id')
  .put(protect, authorize('business', 'admin'), updateOption)
  .delete(protect, authorize('business', 'admin'), deleteOption);

module.exports = router;
