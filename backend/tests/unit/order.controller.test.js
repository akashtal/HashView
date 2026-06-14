const orderController = require('../../controllers/order.controller');

describe('Order Controller', () => {
  it('should have scaffolded functions for Phase 1', () => {
    expect(typeof orderController.createOrder).toBe('function');
    expect(typeof orderController.getOrder).toBe('function');
    expect(typeof orderController.updateOrderStatus).toBe('function');
    expect(typeof orderController.getBusinessOrders).toBe('function');
  });
});
