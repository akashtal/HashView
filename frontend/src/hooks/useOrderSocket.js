import { useEffect, useRef } from 'react';
import orderSocketService from '../services/orderSocket.service';

/**
 * Hook to manage Socket.IO connections for the /orders namespace.
 *
 * @param {Object} options
 * @param {string} [options.orderId] - If provided, joins the room for a specific order (customer tracking)
 * @param {string} [options.businessId] - If provided, joins the room for a business (dashboard/kitchen)
 * @param {string} [options.customerId] - If provided, joins the room for a customer's orders
 * @param {Function} [options.onNewOrder] - Callback when a new order is placed (business only)
 * @param {Function} [options.onOrderStatusUpdated] - Callback when an order status changes
 */
export const useOrderSocket = ({
  orderId,
  businessId,
  customerId,
  onNewOrder,
  onOrderStatusUpdated,
}) => {
  // Use refs to avoid constantly re-binding listeners if callbacks change reference
  const callbacksRef = useRef({ onNewOrder, onOrderStatusUpdated });

  useEffect(() => {
    callbacksRef.current = { onNewOrder, onOrderStatusUpdated };
  }, [onNewOrder, onOrderStatusUpdated]);

  useEffect(() => {
    const handleNewOrder = (order) => {
      if (callbacksRef.current.onNewOrder) {
        callbacksRef.current.onNewOrder(order);
      }
    };

    const handleOrderStatusUpdated = (order) => {
      if (callbacksRef.current.onOrderStatusUpdated) {
        callbacksRef.current.onOrderStatusUpdated(order);
      }
    };

    // Connect and join rooms
    orderSocketService
      .connect()
      .then(() => {
        if (orderId) {
          orderSocketService.joinOrder(orderId);
        }
        if (businessId) {
          orderSocketService.joinBusiness(businessId);
        }
        if (customerId) {
          orderSocketService.joinCustomer(customerId);
        }

        orderSocketService.on('new_order', handleNewOrder);
        orderSocketService.on('order_status_updated', handleOrderStatusUpdated);
      })
      .catch((err) => {
        console.warn('Could not initialize useOrderSocket connection:', err);
      });

    return () => {
      if (orderId) {
        orderSocketService.leaveOrder(orderId);
      }
      if (businessId) {
        orderSocketService.leaveBusiness(businessId);
      }
      if (customerId) {
        orderSocketService.leaveCustomer(customerId);
      }
      orderSocketService.off('new_order', handleNewOrder);
      orderSocketService.off('order_status_updated', handleOrderStatusUpdated);
    };
  }, [orderId, businessId, customerId]);

  return {
    socket: orderSocketService.socket,
  };
};

export default useOrderSocket;
