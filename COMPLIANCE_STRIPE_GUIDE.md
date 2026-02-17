# Mobile Subscription Compliance Report: Stripe vs. IAP for B2B Apps (UK)

**Date:** 2026-02-15
**Region:** United Kingdom
**App Type:** B2B / Pro Features (Business Owner constraints)

## 1. Executive Summary

**Can you use Stripe directly inside your iOS/Android app to unlock business features?**
**NO.**

Both Apple and Google classify "unlocking additional app features" (like push notifications, profile claiming, or analytics) as **digital goods/services**. Therefore, they mandatorily require the use of **In-App Purchase (IAP)** systems (StoreKit for iOS, Google Play Billing for Android).

**The Exceptions:**
*   **"Reader" / Consumption-Only Model:** You *can* use Stripe **on your website**. Users can purchase the plan on your website and then log in to the app to access the unlocked features. However, you generally **cannot link** to that website payment page from within the app.
*   **Enterprise (Apple Only):** If you sold the app directly to a specific company for their employees (volume licensing), you could use custom billing. But for a general "business owner" downloading from the public App Store, this does not apply.

**Recommendation:**
Use the **"Web-Based SaaS" model** (Option 2 below) if you need Stripe and want to avoid the 15-30% app store fees. Users must sign up and pay on your website *before* logging into the app. The app must basically say "Login to your account" and not "Click here to Subscribe".

---

## 2. Policy Analysis (Official Citations)

###  Apple App Store Guidelines

*   **Guideline 3.1.1 (In-App Purchase):**
    > "If you want to unlock features or functionality within your app, (by way of example: subscriptions, in-game currencies, game levels, access to premium content, or unlocking a full version), you must use in-app purchase. Apps may not use their own mechanisms to unlock content or functionality, such as license keys, augmented reality markers, QR codes, etc."
    > *Source: [Apple App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#in-app-purchase)*

*   **Guideline 3.1.3(b) (Multiplatform Services):**
    > "Apps that operate across multiple platforms may allow users to access content, subscriptions, or features they have acquired in your app on other platforms or your web site... provided those items are also available as in-app purchases within the app."
    > *Note: This suggests if you sell it on the web, you usually have to sell it in-app via IAP too, UNLESS you don't link to the web purchase at all.*

*   **UK Specifics:**
    While the UK CMA is actively regulating Apple, the "External Purchase Link Entitlement" (allowing links to Stripe) currently involves complex applications and still requires paying a commission (typically 12-27%) to Apple. It is **not** a "free use of Stripe" pass.

### ▶ Google Play Policies

*   **Payments Policy:**
    > "Developers offering products within a game downloaded on Google Play or providing access to game content must use Google Play In-app Billing as the method of payment."
    > "Apps providing access to cloud software and services (such as data storage services, **business productivity software**, and financial management software) must use Google Play's billing system."
    > *Source: [Google Play Payments Policy](https://support.google.com/googleplay/android-developer/answer/9858738)*

*   **Consumption-Only Exception:**
    > "You are not required to use Google Play's billing system if... your app is a 'consumption-only' app... users can login to access content they paid for elsewhere."
    > *Constraint: You cannot provide a link to the external payment page within the app.*

---

## 3. Recommended Implementation Options

### Option 1: Native In-App Purchases (Easiest UX, Highest Fee)
**Best for:** Conversion rates. Users can subscribe with one tap (FaceID/Fingerprint).
**Fee:** 15% (Small Business Program) or 30%.
**Flow:**
1.  User clicks "Upgrade to Business Pro".
2.  Native Apple/Google sheet appears.
3.  User confirms payment.
4.  App receives receipt -> Validates with Backend -> Unlocks Feature.

### Option 2: The "Web-First" SaaS Model (No Fee, Higher Friction)
**Best for:** Margins (Stripe fees ~2.9% vs Apple 15-30%). Compliance safe *if* you avoid linking.
**Flow:**
1.  **On Website:** Business owner registers and buys "Pro Plan" via Stripe.
2.  **In App:**
    *   User logs in.
    *   App asks Backend: "Does this user have an active Stripe subscription?"
    *   Backend checks database/Stripe: "Yes".
    *   App unlocks Pro features.
3.  **Crucial Constraint:** The app UI for a free user **CANNOT** have a button saying "Subscribe Here" that links to your website. It can only say "Please login to your account" or "Contact your admin".
    *   *Permitted Wording:* "You do not have a Pro subscription. Please login with a Pro enabled account."
    *   *Prohibited Wording:* "Visit our website to buy a subscription."

### Option 3: Hybrid (The "Netflix" Approach)
**Best for:** Maximum reach + Compliance.
*   Offer IAP inside the app (price it higher to cover fees, e.g., £35).
*   Offer Stripe on the web (lower price, e.g., £29).
*   Do **not** link to the web offer from the app. Smart users will find the web price, lazy users will pay the convenient app price.

---

## 4. Technical Implementation (Option 2: Web-First SaaS)

### A. Stripe Checkout (Web Side)
Create a Checkout Session on your Node.js backend when the user clicks "Subscribe" *on your website*.

```javascript
// backend/controllers/subscription.controller.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.createCheckoutSession = async (req, res) => {
  const { userId, planType } = req.body; // 'notify' or 'pro'
  
  // Map plan to Stripe Price ID
  const priceId = planType === 'pro' ? 'price_pro_123' : 'price_notify_123';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: { userId, planType }, // Track who bought it
    success_url: 'https://your-website.com/dashboard?success=true',
    cancel_url: 'https://your-website.com/dashboard?canceled=true',
  });

  res.json({ url: session.url });
};
```

### B. Use Webhooks to Update Database
When Stripe charges successfully, update the user's role/subscription status in MongoDB.

```javascript
// backend/controllers/webhook.controller.js
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { userId, planType } = session.metadata;

    // UPDATE DATABASE: Unlock features for this user
    await User.findByIdAndUpdate(userId, {
      subscription: {
        status: 'active',
        plan: planType,
        stripeCustomerId: session.customer,
        stripeSubscriptionId: session.subscription
      }
    });
  }
  
  // Handle cancellations/failures similarly (invoice.payment_failed, customer.subscription.deleted)
  
  res.json({ received: true });
};
```

### C. Entitlement Check (Mobile App Logic)
In your `MainNavigator.js` or `authSlice.js`, check the status from your backend.

```javascript
// frontend/src/store/slices/authSlice.js
// Accessing the 'features' based on subscription status

export const selectCanSendPush = (state) => {
  const sub = state.auth.user?.subscription;
  return sub?.status === 'active' && (sub.plan === 'notify' || sub.plan === 'pro');
};

export const selectCanClaimProfile = (state) => {
  const sub = state.auth.user?.subscription;
  return sub?.status === 'active' && sub.plan === 'pro';
};
```

---

## 5. Compliance Checklist

1.  [ ] **Remove external payment links** from the iOS/Android app UI. No buttons linking to `your-site.com/pricing`.
2.  [ ] **Update App Store Review Notes:**
    *   "This app is a companion for business owners who have an existing account on our web platform."
    *   "Users generally acquire their account/subscription outside of the app."
    *   Provide a **Test Account** credentials (email/password) that *already has* a Pro subscription active so the reviewer can see the unlocked features.
3.  [ ] **Prepare Marketing Copy:** Ensure your app store description doesn't explicitly say "Subscribe in the app to get X". Instead say "Log in to your Pro account to access X".
4.  [ ] **Terms of Use:** Since you are handling payments (even on web), ensure your Terms of Service are clear and linked in the app (e.g., in Settings).

## 6. Final Recommendation

**Use Option 2 (Web-First SaaS) for the UK market.**

*   **Why:** It avoids the 15-30% Apple/Google tax. It keeps you compliant (as long as you don't link out). It simplifies your tax handling to just Stripe.
*   **The Trade-off:** You cannot aggressively upsell inside the app. If a free user tries to click a locked feature, you must show a generic "Permission Denied" or "Login with Pro Account" message, not a "Buy Now" screen.

If improved conversion is worth the 15% fee to you, switch to **Option 3 (Hybrid)** later: add IAP for convenience, but keep the web option for savvy users.
