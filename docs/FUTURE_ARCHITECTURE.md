# HashView Future Architecture Guide
This document defines the integration points and guidelines for Phase 11+ features.

## 1. Promotions and Coupons
The system will support dynamic promotional codes.
- **Integration Point:** `backend/services/billingEngine.js`
- **Design:** Before calculating taxes, the billing engine will query the Promo collection for active codes. The `discount` field in `Order.billing` will be populated, and taxes will be recalculated against the post-discount subtotal.

## 2. Loyalty Rewards
- **Integration Point:** `order.controller.js` (Status Updates)
- **Design:** When `order.status` transitions to `delivered`, an event will be emitted to a new Loyalty Service (or BullMQ job). The Loyalty Service calculates points based on `billing.grandTotal` and updates the user's reward balance.

## 3. Payment Gateway (Stripe/Razorpay)
- **Integration Point:** `POST /api/orders`
- **Design:** Orders will be created with an initial status of `payment_pending`. The API will return a Stripe `client_secret` to the frontend. The frontend processes the payment. A Stripe Webhook (`POST /api/webhooks/stripe`) will catch the `payment_intent.succeeded` event, update the order status to `new`, and emit the `new_order` Socket.IO event to the business.

## 4. Multi-Language Menus
- **Integration Point:** `MenuItem.model.js`
- **Design:** Add a `translations` object (Map of Strings) to store name/description in target languages (e.g., `es`, `fr`). The frontend sends an `Accept-Language` header, and the backend returns the appropriate translation or falls back to English.

## 5. Multi-Currency Billing
- **Integration Point:** `Business.model.js`
- **Design:** The Business model defines its base `currency`. `billingEngine.js` formats all values according to the business's currency ISO code. No real-time forex conversions are needed since table ordering is strictly localized.

## 6. Service Extraction (Microservices)
Once HashView surpasses 50,000 active concurrent connections, the monolithic Express app should be split:
- **API Gateway:** NGINX or AWS API Gateway.
- **Menu Service:** Handles all read-heavy operations. Scales aggressively via CDN.
- **Order Service:** A dedicated write-heavy service communicating directly with Socket.IO and BullMQ.
- **Billing Service:** Computes taxes/charges (stateless, highly available).
