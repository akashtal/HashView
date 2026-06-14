import { io } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_CONFIG from '../config/api.config';

class OrderSocketService {
  constructor() {
    this.socket = null;
    this.connectionPromise = null;
  }

  async connect() {
    if (this.socket?.connected) return Promise.resolve();
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        const token = await AsyncStorage.getItem('token');

        let baseURL = API_CONFIG.BASE_URL;
        if (baseURL.endsWith('/api')) {
          baseURL = baseURL.substring(0, baseURL.length - 4);
        }

        this.socket = io(`${baseURL}/orders`, {
          auth: { token },
          transports: ['websocket'],
          autoConnect: true,
        });

        this.socket.on('connect', () => {
          console.log('[OrderSocket] Connected to /orders namespace');
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('[OrderSocket] Connection error:', error.message);
          reject(error);
        });

      } catch (error) {
        console.error('[OrderSocket] Initialization error:', error);
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  async joinOrder(orderId) {
    if (!orderId) return;
    try {
      await this.connect();
      this.socket.emit('join_order', orderId);
    } catch (err) {
      console.log('Failed to join order room', err);
    }
  }

  leaveOrder(orderId) {
    if (this.socket?.connected && orderId) {
      this.socket.emit('leave_order', orderId);
    }
  }

  async joinBusiness(businessId) {
    if (!businessId) return;
    try {
      await this.connect();
      this.socket.emit('join_business', businessId);
    } catch (err) {
      console.log('Failed to join business room', err);
    }
  }

  leaveBusiness(businessId) {
    if (this.socket?.connected && businessId) {
      this.socket.emit('leave_business', businessId);
    }
  }

  async joinCustomer(customerId) {
    if (!customerId) return;
    try {
      await this.connect();
      this.socket.emit('join_customer', customerId);
    } catch (err) {
      console.log('Failed to join customer room', err);
    }
  }

  leaveCustomer(customerId) {
    if (this.socket?.connected && customerId) {
      this.socket.emit('leave_customer', customerId);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    } else {
      // Setup listener after connect if not connected
      this.connect().then(() => {
        this.socket.on(event, callback);
      }).catch(() => { });
    }
  }

  off(event, callback) {
    if (this.socket) {
      this.socket.off(event, callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connectionPromise = null;
    }
  }
}

const orderSocketService = new OrderSocketService();
export default orderSocketService;
