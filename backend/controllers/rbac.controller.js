const bcrypt = require('bcryptjs');
const User = require('../models/User.model');
const { ROLES, PERMISSIONS, getEffectivePermissions, getRoleLabel } = require('../constants/rbac');

// ─── Helper ───────────────────────────────────────────────────────────────────
const formatAdminUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  adminRole: user.adminRole || user.role,
  permissions: user.permissions || [],
  effectivePermissions: getEffectivePermissions(user.adminRole || user.role, user.permissions || []),
  status: user.status,
  isActive: user.status === 'active',
  createdBy: user.createdBy,
  lastLogin: user.lastLogin,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

// ─── GET /api/admin/rbac/me ───────────────────────────────────────────────────
// @desc    Get current admin user's profile & resolved permissions
// @access  Private (admin role required)
exports.getCurrentUserPermissions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      user: formatAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/rbac/users ────────────────────────────────────────────────
// @desc    Get all admin-tier users (role === 'admin')
// @access  Private (MANAGE_ROLES permission required)
exports.getAllAdminUsers = async (req, res, next) => {
  try {
    const adminUsers = await User.find({ role: 'admin' })
      .select('-passwordHash')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: adminUsers.length,
      users: adminUsers.map(formatAdminUser),
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/admin/rbac/users ───────────────────────────────────────────────
// @desc    Create a new admin-tier user
// @access  Private (MANAGE_ROLES permission required)
exports.createAdminUser = async (req, res, next) => {
  try {
    const { name, email, password, adminRole, permissions = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters',
      });
    }

    // Validate adminRole
    const validAdminRoles = [ROLES.ADMIN, ROLES.BUSINESS_MANAGER, ROLES.VIEWER];
    const resolvedAdminRole = adminRole && validAdminRoles.includes(adminRole) ? adminRole : ROLES.VIEWER;

    // Check if email already taken
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
      });
    }

    // Validate custom permissions
    const validPermissions = Object.values(PERMISSIONS);
    const sanitizedPermissions = (permissions || []).filter(p => validPermissions.includes(p));

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash: password, // pre-save hook hashes it
      role: 'admin',
      adminRole: resolvedAdminRole,
      permissions: sanitizedPermissions,
      status: 'active',
      emailVerified: true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      user: formatAdminUser(newUser),
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/rbac/users/:id ───────────────────────────────────────────
// @desc    Update an admin user's role, permissions, or basic info
// @access  Private (MANAGE_ROLES permission required)
exports.updateAdminUser = async (req, res, next) => {
  try {
    const { name, adminRole, permissions, password } = req.body;

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    // Prevent modifying the primary admin (the signed-in SUPER root admin with no adminRole)
    // Only allow if the editor is modifying themselves or someone they created
    // (No hard block — just don't let them remove their own permissions accidentally)

    if (name) user.name = name.trim();

    if (adminRole !== undefined) {
      const validAdminRoles = [ROLES.ADMIN, ROLES.BUSINESS_MANAGER, ROLES.VIEWER];
      if (!validAdminRoles.includes(adminRole)) {
        return res.status(400).json({ success: false, message: 'Invalid adminRole' });
      }
      user.adminRole = adminRole;
    }

    if (permissions !== undefined) {
      const validPermissions = Object.values(PERMISSIONS);
      user.permissions = permissions.filter(p => validPermissions.includes(p));
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters',
        });
      }
      user.passwordHash = password; // pre-save hook hashes it
    }

    await user.save();

    res.json({
      success: true,
      message: 'Admin user updated successfully',
      user: formatAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/rbac/users/:id/status ────────────────────────────────────
// @desc    Activate or deactivate an admin user
// @access  Private (MANAGE_ROLES permission required)
exports.toggleAdminUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    // Prevent deactivating yourself
    if (String(user._id) === String(req.user._id) && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account',
      });
    }

    user.status = isActive ? 'active' : 'inactive';
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      user: formatAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── PUT /api/admin/rbac/users/:id/permissions ───────────────────────────────
// @desc    Update only a user's custom permissions
// @access  Private (MANAGE_ROLES permission required)
exports.updateUserPermissions = async (req, res, next) => {
  try {
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'permissions must be an array' });
    }

    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    const validPermissions = Object.values(PERMISSIONS);
    user.permissions = permissions.filter(p => validPermissions.includes(p));
    await user.save();

    res.json({
      success: true,
      message: 'Permissions updated successfully',
      user: formatAdminUser(user),
    });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE /api/admin/rbac/users/:id ────────────────────────────────────────
// @desc    Delete an admin user
// @access  Private (MANAGE_ROLES permission required)
exports.deleteAdminUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || user.role !== 'admin') {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    // Prevent deleting yourself
    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account',
      });
    }

    await user.deleteOne();

    res.json({ success: true, message: 'Admin user deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/admin/rbac/roles ────────────────────────────────────────────────
// @desc    Get all available roles and their default permissions
// @access  Private (admin role required)
exports.getRolesAndPermissions = async (req, res, next) => {
  try {
    const { ROLE_PERMISSIONS } = require('../constants/rbac');

    const roles = Object.values(ROLES).map(role => ({
      role,
      label: getRoleLabel(role),
      permissions: ROLE_PERMISSIONS[role] || [],
    }));

    const allPermissions = Object.entries(PERMISSIONS).map(([key, value]) => ({
      key,
      value,
    }));

    res.json({
      success: true,
      roles,
      allPermissions,
    });
  } catch (error) {
    next(error);
  }
};
