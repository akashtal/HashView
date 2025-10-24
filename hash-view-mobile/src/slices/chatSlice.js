import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { chatAPI } from '../services/api';

// Async thunks
export const fetchConversations = createAsyncThunk(
  'chat/fetchConversations',
  async (params, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getConversations(params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

export const createConversation = createAsyncThunk(
  'chat/createConversation',
  async (participantId, { rejectWithValue }) => {
    try {
      const response = await chatAPI.createConversation(participantId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create conversation');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'chat/fetchMessages',
  async ({ conversationId, params }, { rejectWithValue }) => {
    try {
      const response = await chatAPI.getMessages(conversationId, params);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async (messageData, { rejectWithValue }) => {
    try {
      const response = await chatAPI.sendMessage(messageData);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

export const markConversationRead = createAsyncThunk(
  'chat/markConversationRead',
  async (conversationId, { rejectWithValue }) => {
    try {
      const response = await chatAPI.markConversationRead(conversationId);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark conversation as read');
    }
  }
);

const initialState = {
  conversations: [],
  currentConversation: null,
  messages: [],
  pagination: {
    current: 1,
    pages: 0,
    total: 0,
    limit: 50,
    hasMore: false,
  },
  isLoading: false,
  error: null,
  typingUsers: {},
  unreadCount: 0,
  isConnected: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConversation: (state, action) => {
      state.currentConversation = action.payload;
    },
    clearCurrentConversation: (state) => {
      state.currentConversation = null;
      state.messages = [];
    },
    addMessage: (state, action) => {
      const message = action.payload;
      const existingIndex = state.messages.findIndex(m => m._id === message._id);
      
      if (existingIndex === -1) {
        state.messages.push(message);
      } else {
        state.messages[existingIndex] = message;
      }
    },
    updateMessage: (state, action) => {
      const { messageId, updates } = action.payload;
      const index = state.messages.findIndex(m => m._id === messageId);
      
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...updates };
      }
    },
    removeMessage: (state, action) => {
      const messageId = action.payload;
      state.messages = state.messages.filter(m => m._id !== messageId);
    },
    updateConversation: (state, action) => {
      const conversation = action.payload;
      const index = state.conversations.findIndex(c => c._id === conversation._id);
      
      if (index !== -1) {
        state.conversations[index] = conversation;
      } else {
        state.conversations.unshift(conversation);
      }
    },
    setTypingUser: (state, action) => {
      const { userId, isTyping, conversationId } = action.payload;
      
      if (isTyping) {
        state.typingUsers[conversationId] = {
          ...state.typingUsers[conversationId],
          [userId]: true,
        };
      } else {
        if (state.typingUsers[conversationId]) {
          delete state.typingUsers[conversationId][userId];
        }
      }
    },
    setConnectionStatus: (state, action) => {
      state.isConnected = action.payload;
    },
    updateUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch conversations
      .addCase(fetchConversations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.isLoading = false;
        state.conversations = action.payload.conversations;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create conversation
      .addCase(createConversation.fulfilled, (state, action) => {
        const conversation = action.payload.conversation;
        const existingIndex = state.conversations.findIndex(c => c._id === conversation._id);
        
        if (existingIndex === -1) {
          state.conversations.unshift(conversation);
        }
      })
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        state.messages = action.payload.messages;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Send message
      .addCase(sendMessage.fulfilled, (state, action) => {
        const message = action.payload.message;
        const existingIndex = state.messages.findIndex(m => m._id === message._id);
        
        if (existingIndex === -1) {
          state.messages.push(message);
        } else {
          state.messages[existingIndex] = message;
        }
      })
      // Mark conversation read
      .addCase(markConversationRead.fulfilled, (state, action) => {
        const { conversationId, unreadCounts } = action.payload;
        const conversation = state.conversations.find(c => c._id === conversationId);
        
        if (conversation) {
          conversation.unreadCounts = unreadCounts;
        }
      });
  },
});

export const {
  clearError,
  setCurrentConversation,
  clearCurrentConversation,
  addMessage,
  updateMessage,
  removeMessage,
  updateConversation,
  setTypingUser,
  setConnectionStatus,
  updateUnreadCount,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
