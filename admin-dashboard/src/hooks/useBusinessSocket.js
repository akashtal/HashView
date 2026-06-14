import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.PROD && import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001');

/**
 * Web socket hook for business portal — mirrors the React Native useOrderSocket.
 * @param {string} businessId
 * @param {{ onNewOrder, onOrderStatusUpdated }} callbacks
 */
export default function useBusinessSocket({ businessId, onNewOrder, onOrderStatusUpdated }) {
  const socketRef = useRef(null);
  const cbRef = useRef({ onNewOrder, onOrderStatusUpdated });

  // Keep callbacks fresh without reconnecting
  useEffect(() => {
    cbRef.current = { onNewOrder, onOrderStatusUpdated };
  }, [onNewOrder, onOrderStatusUpdated]);

  useEffect(() => {
    if (!businessId) return;

    const token = localStorage.getItem('businessToken');
    const socket = io(`${SOCKET_URL}/orders`, {
      auth: { token },
      transports: ['websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_business', businessId);
    });

    socket.on('new_order', (order) => {
      cbRef.current.onNewOrder?.(order);
      // Browser notification
      if (Notification.permission === 'granted') {
        new Notification('🔔 New Order!', {
          body: `Table ${order.tableNumber} — ${order.orderNumber}`,
          icon: '/favicon.ico',
        });
      }
    });

    socket.on('order_status_updated', (order) => {
      cbRef.current.onOrderStatusUpdated?.(order);
    });

    socket.on('disconnect', () => {
      console.log('[BusinessSocket] Disconnected');
    });

    // Request notification permission once
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      socket.disconnect();
    };
  }, [businessId]);
}
