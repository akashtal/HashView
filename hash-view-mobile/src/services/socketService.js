import { io } from 'socket.io-client';
import { store } from '../store';
import { 
  addMessage, 
  updateMessage, 
  updateConversation, 
  setTypingUser, 
  setConnectionStatus 
} from '../slices/chatSlice';

class SocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
  }

  connect(token) {
    if (this.socket?.connected) {
      return;
    }

    const SOCKET_URL = __DEV__ 
      ? 'http://localhost:5000' 
      : 'https://your-production-api.com';

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    this.setupEventListeners();
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      store.dispatch(setConnectionStatus(false));
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('Socket connected');
      this.isConnected = true;
      store.dispatch(setConnectionStatus(true));
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
      this.isConnected = false;
      store.dispatch(setConnectionStatus(false));
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      this.isConnected = false;
      store.dispatch(setConnectionStatus(false));
    });

    // Chat events
    this.socket.on('new_message', (data) => {
      const { message, conversation } = data;
      store.dispatch(addMessage(message));
      store.dispatch(updateConversation(conversation));
    });

    this.socket.on('message_read', (data) => {
      const { messageId, readBy, readAt } = data;
      store.dispatch(updateMessage({
        messageId,
        updates: { readAt, readBy }
      }));
    });

    this.socket.on('conversation_read', (data) => {
      const { conversationId, unreadCounts } = data;
      store.dispatch(updateConversation({
        _id: conversationId,
        unreadCounts
      }));
    });

    this.socket.on('user_typing', (data) => {
      const { userId, userName, conversationId } = data;
      store.dispatch(setTypingUser({
        userId,
        isTyping: true,
        conversationId
      }));
    });

    this.socket.on('user_stopped_typing', (data) => {
      const { userId, conversationId } = data;
      store.dispatch(setTypingUser({
        userId,
        isTyping: false,
        conversationId
      }));
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }

  // Chat methods
  joinConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('join_conversation', conversationId);
    }
  }

  leaveConversation(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('leave_conversation', conversationId);
    }
  }

  sendMessage(messageData) {
    if (this.socket?.connected) {
      this.socket.emit('send_message', messageData);
    }
  }

  startTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_start', { conversationId });
    }
  }

  stopTyping(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('typing_stop', { conversationId });
    }
  }

  markMessageRead(messageId) {
    if (this.socket?.connected) {
      this.socket.emit('mark_message_read', { messageId });
    }
  }

  markConversationRead(conversationId) {
    if (this.socket?.connected) {
      this.socket.emit('mark_conversation_read', { conversationId });
    }
  }

  // Utility methods
  isSocketConnected() {
    return this.socket?.connected || false;
  }

  reconnect(token) {
    this.disconnect();
    this.connect(token);
  }
}

// Export singleton instance
export default new SocketService();
