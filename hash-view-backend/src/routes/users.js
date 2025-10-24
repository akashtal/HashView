const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', auth, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
});

// @route   PATCH /api/users/profile
// @desc    Update user profile
// @access  Private
router.patch('/profile', [
  auth,
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be between 2 and 50 characters'),
  body('phone').optional().matches(/^\+?[\d\s\-\(\)]+$/).withMessage('Please provide a valid phone number'),
  body('avatar').optional().isURL().withMessage('Avatar must be a valid URL')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, phone, avatar } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (avatar) updateData.avatar = avatar;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
});

// @route   POST /api/users/register-push-token
// @desc    Register Expo push token
// @access  Private
router.post('/register-push-token', [
  auth,
  body('expoPushToken').notEmpty().withMessage('Expo push token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { expoPushToken } = req.body;

    // Add token if not already present
    if (!req.user.expoPushTokens.includes(expoPushToken)) {
      await User.findByIdAndUpdate(
        req.user._id,
        { $push: { expoPushTokens: expoPushToken } }
      );
    }

    res.json({
      success: true,
      message: 'Push token registered successfully'
    });

  } catch (error) {
    console.error('Register push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while registering push token'
    });
  }
});

// @route   DELETE /api/users/register-push-token
// @desc    Unregister Expo push token
// @access  Private
router.delete('/register-push-token', [
  auth,
  body('expoPushToken').notEmpty().withMessage('Expo push token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { expoPushToken } = req.body;

    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { expoPushTokens: expoPushToken } }
    );

    res.json({
      success: true,
      message: 'Push token unregistered successfully'
    });

  } catch (error) {
    console.error('Unregister push token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while unregistering push token'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID (public profile)
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('name avatar role verified createdAt');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

module.exports = router;
