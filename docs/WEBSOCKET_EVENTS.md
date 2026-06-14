# HashView WebSocket Events
Namespace: `/orders`

## Authentication
Clients must pass a JWT token on connection:
```javascript
const socket = io('/orders', { auth: { token: 'JWT_HERE' } });
```

## Rooms
- `business_{businessId}`: Joined by dashboard users.
- `customer_{userId}`: Joined by logged-in customers.
- `order_{orderId}`: Joined by guest customers tracking a specific order.

## Server-to-Client Events
### `new_order`
Emitted to `business_{businessId}` when a new order is placed.
**Payload:** Full Order Object.

### `order_status_updated`
Emitted to all rooms when an order transitions state.
**Payload:** Full Order Object.

### `business.order_stats`
Emitted every 60 seconds to `business_{businessId}`.
**Payload:** `{ activeCount: 5, dailyRevenue: 1250.50 }`
