const express = require('express');
const { body, query, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages
// @desc    Get messages for a conversation
// @access  Private
router.get('/', [
  auth,
  query('conversationId').isMongoId().withMessage('Valid conversation ID is required'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('cursor').optional().isMongoId().withMessage('Cursor must be a valid message ID')
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

    const { conversationId, page = 1, limit = 50, cursor } = req.query;
    const skip = (page - 1) * limit;

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    let query = { conversationId, isDeleted: false };

    // Cursor-based pagination
    if (cursor) {
      const cursorMessage = await Message.findById(cursor);
      if (cursorMessage) {
        query.createdAt = { $lt: cursorMessage.createdAt };
      }
    }

    const messages = await Message.find(query)
      .populate('sender', 'name avatar')
      .populate('replyTo', 'text sender')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Message.countDocuments({ conversationId, isDeleted: false });

    res.json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit),
          hasMore: skip + messages.length < total
        }
      }
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching messages'
    });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', [
  auth,
  body('conversationId').isMongoId().withMessage('Valid conversation ID is required'),
  body('text').optional().isLength({ max: 1000 }).withMessage('Message cannot be more than 1000 characters'),
  body('type').optional().isIn(['text', 'image', 'file']).withMessage('Invalid message type'),
  body('mediaUrl').optional().isURL().withMessage('Media URL must be valid'),
  body('replyTo').optional().isMongoId().withMessage('Reply to must be a valid message ID')
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

    const { conversationId, text, type = 'text', mediaUrl, replyTo } = req.body;

    // Verify user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Validate message content
    if (!text && !mediaUrl) {
      return res.status(400).json({
        success: false,
        message: 'Message must have text or media'
      });
    }

    // Create message
    const message = new Message({
      conversationId,
      sender: req.user._id,
      text,
      type,
      mediaUrl,
      replyTo
    });

    await message.save();
    await message.populate('sender', 'name avatar');
    if (replyTo) {
      await message.populate('replyTo', 'text sender');
    }

    // Update conversation
    conversation.lastMessage = {
      text: text || (type === 'image' ? '📷 Image' : '📎 File'),
      sender: req.user._id,
      timestamp: message.createdAt
    };
    conversation.lastTimestamp = message.createdAt;

    // Update unread counts for other participants
    conversation.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const currentCount = conversation.unreadCounts.get(participantId.toString()) || 0;
        conversation.unreadCounts.set(participantId.toString(), currentCount + 1);
      }
    });

    await conversation.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message'
    });
  }
});

// @route   PATCH /api/messages/:id
// @desc    Edit a message
// @access  Private
router.patch('/:id', [
  auth,
  body('text').isLength({ min: 1, max: 1000 }).withMessage('Message text must be between 1 and 1000 characters')
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

    const { text } = req.body;

    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user._id,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Update message
    message.text = text;
    message.isEdited = true;
    message.editedAt = new Date();

    await message.save();

    res.json({
      success: true,
      message: 'Message updated successfully',
      data: {
        message
      }
    });

  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while editing message'
    });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findOne({
      _id: req.params.id,
      sender: req.user._id,
      isDeleted: false
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.text = 'This message was deleted';

    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting message'
    });
  }
});

// @route   PATCH /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.patch('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is participant in conversation
    const conversation = await Conversation.findOne({
      _id: message.conversationId,
      participants: req.user._id
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read if not already read
    if (!message.readAt) {
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking message as read'
    });
  }
});

module.exports = router;
