const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const { sendPushNotificationToUser } = require('./pushNotificationService');

const socketHandler = (io) => {
  // Store connected users
  const connectedUsers = new Map();

  // Authentication middleware for socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication error: Invalid user'));
      }

      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.name} connected with socket ${socket.id}`);
    
    // Store user connection
    connectedUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date()
    });

    // Join user to their personal room
    socket.join(`user:${socket.userId}`);

    // Update user's last seen
    User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() }).catch(console.error);

    // Handle join conversation
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
      console.log(`User ${socket.user.name} joined conversation ${conversationId}`);
    });

    // Handle leave conversation
    socket.on('leave_conversation', (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      console.log(`User ${socket.user.name} left conversation ${conversationId}`);
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user_typing', {
        userId: socket.userId,
        userName: socket.user.name,
        conversationId
      });
    });

    socket.on('typing_stop', (data) => {
      const { conversationId } = data;
      socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
        userId: socket.userId,
        conversationId
      });
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      try {
        const { conversationId, text, type = 'text', mediaUrl, replyTo } = data;

        // Verify user is participant in conversation
        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId,
          isActive: true
        });

        if (!conversation) {
          socket.emit('error', { message: 'Conversation not found' });
          return;
        }

        // Create message
        const message = new Message({
          conversationId,
          sender: socket.userId,
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
          sender: socket.userId,
          timestamp: message.createdAt
        };
        conversation.lastTimestamp = message.createdAt;

        // Update unread counts for other participants
        conversation.participants.forEach(participantId => {
          if (participantId.toString() !== socket.userId) {
            const currentCount = conversation.unreadCounts.get(participantId.toString()) || 0;
            conversation.unreadCounts.set(participantId.toString(), currentCount + 1);
          }
        });

        await conversation.save();

        // Emit message to conversation participants
        io.to(`conversation:${conversationId}`).emit('new_message', {
          message,
          conversation: {
            _id: conversation._id,
            lastMessage: conversation.lastMessage,
            lastTimestamp: conversation.lastTimestamp,
            unreadCounts: Object.fromEntries(conversation.unreadCounts)
          }
        });

        // Send push notifications to offline participants
        for (const participantId of conversation.participants) {
          if (participantId.toString() !== socket.userId) {
            const isOnline = connectedUsers.has(participantId.toString());
            
            if (!isOnline) {
              try {
                await sendPushNotificationToUser(participantId.toString(), {
                  title: socket.user.name,
                  body: text || (type === 'image' ? '📷 Image' : '📎 File'),
                  data: {
                    type: 'message',
                    conversationId,
                    messageId: message._id.toString()
                  }
                });
              } catch (error) {
                console.error('Failed to send push notification:', error);
              }
            }
          }
        }

      } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message read
    socket.on('mark_message_read', async (data) => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (!message) return;

        // Check if user is participant in conversation
        const conversation = await Conversation.findOne({
          _id: message.conversationId,
          participants: socket.userId
        });

        if (!conversation) return;

        // Mark as read if not already read
        if (!message.readAt) {
          message.readAt = new Date();
          await message.save();

          // Emit read receipt to conversation
          io.to(`conversation:${message.conversationId}`).emit('message_read', {
            messageId,
            readBy: socket.userId,
            readAt: message.readAt
          });
        }

      } catch (error) {
        console.error('Mark message read error:', error);
      }
    });

    // Handle conversation read
    socket.on('mark_conversation_read', async (data) => {
      try {
        const { conversationId } = data;

        const conversation = await Conversation.findOne({
          _id: conversationId,
          participants: socket.userId
        });

        if (!conversation) return;

        // Reset unread count for this user
        conversation.unreadCounts.set(socket.userId, 0);
        await conversation.save();

        // Emit to conversation participants
        io.to(`conversation:${conversationId}`).emit('conversation_read', {
          conversationId,
          readBy: socket.userId,
          unreadCounts: Object.fromEntries(conversation.unreadCounts)
        });

      } catch (error) {
        console.error('Mark conversation read error:', error);
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.name} disconnected`);
      connectedUsers.delete(socket.userId);
    });
  });

  // Broadcast user online/offline status
  const broadcastUserStatus = (userId, isOnline) => {
    io.emit('user_status_change', {
      userId,
      isOnline,
      lastSeen: new Date()
    });
  };

  return {
    connectedUsers,
    broadcastUserStatus
  };
};

module.exports = socketHandler;
