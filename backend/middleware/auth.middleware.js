const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const BusinessOwner = require('../models/BusinessOwner.model');
const { getEffectivePermissions } = require('../constants/rbac');

// Protect routes - Verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Make sure token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from appropriate collection based on userType
      if (decoded.userType === 'business') {
        req.user = await BusinessOwner.findById(decoded.id).select('-passwordHash').populate('businesses');
      } else {
        // For customer, admin, or old tokens without userType
        req.user = await User.findById(decoded.id).select('-passwordHash');
        
        // If not found in User collection, try BusinessOwner (for backward compatibility)
        if (!req.user) {
          req.user = await BusinessOwner.findById(decoded.id).select('-passwordHash').populate('businesses');
        }
      }

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      if (req.user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'Account is not active'
        });
      }

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
    next(error);
  }
};

// Grant access to specific roles (legacy — kept for backward compatibility)
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({
        success: false,
        message: 'User role not found. Please log in again.'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user.role}' is not authorized to access this route. Required: ${roles.join(', ')}`
      });
    }
    next();
  };
};

// Optional auth - doesn't fail if no token
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from appropriate collection based on userType
        if (decoded.userType === 'business') {
          req.user = await BusinessOwner.findById(decoded.id).select('-passwordHash').populate('businesses');
        } else {
          req.user = await User.findById(decoded.id).select('-passwordHash');
          
          // If not found in User collection, try BusinessOwner
          if (!req.user) {
            req.user = await BusinessOwner.findById(decoded.id).select('-passwordHash').populate('businesses');
          }
        }
      } catch (error) {
        // Token invalid but continue anyway
        req.user = null;
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Ensure user is logged in AND is an admin-tier user (role === 'admin').
 * Used as a base guard for all admin management routes.
 */
exports.requireAdminTier = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admin privileges required.'
    });
  }
  next();
};

/**
 * Middleware factory: Check that the authenticated user has ALL of the specified
 * permissions (combining role defaults + custom per-user overrides).
 *
 * - Users with role='admin' and NO adminRole set → treated as full admin (all permissions)
 * - Users with role='admin' and adminRole='BUSINESS_MANAGER' or 'VIEWER' → restricted
 *
 * Usage:  router.post('/businesses', protect, checkPermission('CREATE_BUSINESS'), handler);
 */
exports.checkPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    // adminRole (BUSINESS_MANAGER / VIEWER) overrides bare 'admin' for permission lookup.
    // If adminRole is null/undefined the user is a legacy full admin → gets all perms.
    const effectiveRole = req.user.adminRole || req.user.role;
    const effectivePermissions = getEffectivePermissions(
      effectiveRole,
      req.user.permissions || []
    );

    const missing = requiredPermissions.filter(p => !effectivePermissions.includes(p));
    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Permission denied. Required: ${missing.join(', ')}`
      });
    }

    next();
  };
};
