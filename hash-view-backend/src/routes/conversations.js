const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/conversations
// @desc    Get user conversations
// @access  Private
router.get('/', [
  auth,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
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

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const conversations = await Conversation.find({
      participants: req.user._id,
      isActive: true
    })
      .populate('participants', 'name avatar lastSeen')
      .populate('lastMessage.sender', 'name avatar')
      .sort({ lastTimestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Conversation.countDocuments({
      participants: req.user._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        conversations,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversations'
    });
  }
});

// @route   POST /api/conversations
// @desc    Create or get conversation
// @access  Private
router.post('/', [
  auth,
  body('participantId').isMongoId().withMessage('Valid participant ID is required')
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

    const { participantId } = req.body;

    // Check if participant exists
    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({
        success: false,
        message: 'Participant not found'
      });
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId] },
      type: 'direct'
    }).populate('participants', 'name avatar lastSeen');

    if (!conversation) {
      // Create new conversation
      conversation = new Conversation({
        participants: [req.user._id, participantId],
        type: 'direct'
      });

      await conversation.save();
      await conversation.populate('participants', 'name avatar lastSeen');
    }

    res.status(201).json({
      success: true,
      data: {
        conversation
      }
    });

  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating conversation'
    });
  }
});

// @route   GET /api/conversations/:id
// @desc    Get conversation by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id,
      isActive: true
    })
      .populate('participants', 'name avatar lastSeen')
      .populate('lastMessage.sender', 'name avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: {
        conversation
      }
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching conversation'
    });
  }
});

// @route   PATCH /api/conversations/:id/read
// @desc    Mark conversation as read
// @access  Private
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Reset unread count for this user
    conversation.unreadCounts.set(req.user._id.toString(), 0);
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation marked as read'
    });

  } catch (error) {
    console.error('Mark conversation as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking conversation as read'
    });
  }
});

// @route   DELETE /api/conversations/:id
// @desc    Delete conversation
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.id,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Mark as inactive instead of deleting
    conversation.isActive = false;
    await conversation.save();

    res.json({
      success: true,
      message: 'Conversation deleted successfully'
    });

  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting conversation'
    });
  }
});

module.exports = router;
