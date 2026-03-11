const Stripe = require('stripe');
const BusinessOwner = require('../models/BusinessOwner.model');
const logger = require('../utils/logger');
const { verifyToken } = require('../utils/jwt');


// ─── Fix 1: Stripe singleton — created once at startup, not per-request ───────
// Avoids TLS handshake overhead on every API call and prevents misconfiguration
// from being silently swallowed mid-flight.
if (!process.env.STRIPE_SECRET_KEY) {
    logger.error('[Subscription] STRIPE_SECRET_KEY is not set — subscription features will fail');
}
const stripe = process.env.STRIPE_SECRET_KEY
    ? Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
    : null;

const getStripe = () => {
    if (!stripe) throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY.');
    return stripe;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscription/status
// Returns the current subscription status for the authenticated business owner.
// Self-heals missed webhooks by querying Stripe directly.
// ─────────────────────────────────────────────────────────────────────────────
exports.getStatus = async (req, res, next) => {
    try {
        const owner = await BusinessOwner
            .findById(req.user._id)
            .select('+subscription.stripeCustomerId +subscription.stripeSubscriptionId +subscription.stripePriceId');

        if (!owner) {
            return res.status(404).json({ success: false, message: 'Business owner not found' });
        }

        const stripe = getStripe();

        // ── Case 1: Has a subscriptionId → sync current status from Stripe ───
        if (owner.subscription?.stripeSubscriptionId) {
            try {
                const stripeSub = await stripe.subscriptions.retrieve(
                    owner.subscription.stripeSubscriptionId
                );
                if (owner.subscription.status !== stripeSub.status) {
                    owner.subscription.status = stripeSub.status;
                    owner.subscription.currentPeriodEnd = new Date(stripeSub.current_period_end * 1000);
                    owner.subscription.cancelAtPeriodEnd = stripeSub.cancel_at_period_end;
                    await owner.save();
                    logger.info(`[Subscription] Synced status for owner ${owner._id}: ${stripeSub.status}`);
                }
            } catch (syncErr) {
                logger.warn(`[Subscription] Could not sync subscription from Stripe: ${syncErr.message}`);
            }
        }

        // ── Case 2: Has customerId but NO subscriptionId (missed webhook) ────
        // Self-heal: look up active subscriptions from Stripe by customer ID.
        else if (owner.subscription?.stripeCustomerId && !owner.subscription?.stripeSubscriptionId) {
            try {
                const subs = await stripe.subscriptions.list({
                    customer: owner.subscription.stripeCustomerId,
                    status: 'all',
                    limit: 5,
                });

                const activeSub = subs.data.find(s =>
                    s.status === 'active' || s.status === 'trialing'
                ) || subs.data[0];

                if (activeSub) {
                    owner.subscription.status = activeSub.status;
                    owner.subscription.stripeSubscriptionId = activeSub.id;
                    owner.subscription.stripePriceId = activeSub.items.data[0]?.price?.id || null;
                    owner.subscription.plan = 'pro_monthly';
                    owner.subscription.currentPeriodStart = new Date(activeSub.current_period_start * 1000);
                    owner.subscription.currentPeriodEnd = new Date(activeSub.current_period_end * 1000);
                    owner.subscription.cancelAtPeriodEnd = activeSub.cancel_at_period_end;
                    owner.subscription.trialEnd = activeSub.trial_end
                        ? new Date(activeSub.trial_end * 1000) : null;
                    await owner.save();
                    logger.info(`[Subscription] Self-healed missed webhook for owner ${owner._id}: ${activeSub.status}`);
                }
            } catch (healErr) {
                logger.warn(`[Subscription] Self-heal failed: ${healErr.message}`);
            }
        }

        res.json({
            success: true,
            isPro: owner.isPro,
            subscription: {
                status: owner.subscription?.status || 'inactive',
                plan: owner.subscription?.plan || null,
                currentPeriodEnd: owner.subscription?.currentPeriodEnd || null,
                cancelAtPeriodEnd: owner.subscription?.cancelAtPeriodEnd || false,
                trialEnd: owner.subscription?.trialEnd || null,
            },
        });
    } catch (error) {
        logger.error(`[Subscription] getStatus error: ${error.message}`);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscription/create-checkout-session
// Creates a Stripe Checkout session URL. The app opens it in the browser.
// ─────────────────────────────────────────────────────────────────────────────
exports.createCheckoutSession = async (req, res, next) => {
    try {
        const stripe = getStripe();

        // ── Map planType to the correct Stripe Price ID ───────────────────────
        const { planType = 'monthly' } = req.body;

        const PRICE_MAP = {
            monthly: process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID,
            '6month': process.env.STRIPE_PRICE_ID_6MONTH,
            yearly: process.env.STRIPE_PRICE_ID_YEARLY,
        };

        const priceId = PRICE_MAP[planType];

        if (!priceId) {
            return res.status(400).json({
                success: false,
                message: `Invalid or unconfigured plan: "${planType}". Check your STRIPE_PRICE_ID_* env vars.`,
            });
        }

        const owner = await BusinessOwner
            .findById(req.user._id)
            .select('+subscription.stripeCustomerId +subscription.stripeSubscriptionId');

        if (!owner) {
            return res.status(404).json({ success: false, message: 'Business owner not found' });
        }

        // Prevent duplicate active subscriptions
        if (owner.isPro) {
            return res.status(400).json({
                success: false,
                message: 'You already have an active Pro subscription. Use "Manage Subscription" to change your plan.',
            });
        }

        // ── Get or create Stripe Customer ─────────────────────────────────────
        let customerId = owner.subscription?.stripeCustomerId;

        // If a customer ID exists, verify it's valid in the current Stripe mode.
        // When switching from test → live, the old cus_test_... ID won't exist.
        if (customerId) {
            try {
                await stripe.customers.retrieve(customerId);
            } catch (stripeErr) {
                if (stripeErr.code === 'resource_missing') {
                    // Stale test-mode customer ID — clear it and create a fresh one below
                    logger.warn(`[Subscription] Stale customer ID ${customerId} detected (mode switch?). Clearing and creating new customer.`);
                    customerId = null;
                    owner.subscription.stripeCustomerId = null;
                    owner.subscription.stripeSubscriptionId = null;
                    owner.subscription.status = 'inactive';
                    await owner.save();
                } else {
                    throw stripeErr; // Re-throw unexpected errors
                }
            }
        }

        if (!customerId) {
            const customer = await stripe.customers.create(
                {
                    email: owner.email,
                    name: owner.name,
                    metadata: { ownerId: owner._id.toString() },
                },
                { idempotencyKey: `customer-create-live-${owner._id.toString()}` }
            );
            customerId = customer.id;
            owner.subscription.stripeCustomerId = customerId;
            await owner.save();
            logger.info(`[Subscription] Created Stripe customer ${customerId} for owner ${owner._id}`);
        }

        const successUrl = process.env.APP_DEEP_LINK_BASE
            ? `${process.env.APP_DEEP_LINK_BASE}://subscription-success?session_id={CHECKOUT_SESSION_ID}`
            : `${process.env.BACKEND_URL || 'https://hashview.app'}/subscription/success`;

        const cancelUrl = process.env.APP_DEEP_LINK_BASE
            ? `${process.env.APP_DEEP_LINK_BASE}://subscription-cancel`
            : `${process.env.BACKEND_URL || 'https://hashview.app'}/subscription/cancel`;

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            mode: 'subscription',
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { ownerId: owner._id.toString(), planType },
            subscription_data: {
                metadata: { ownerId: owner._id.toString(), planType },
            },
            allow_promotion_codes: true,
        });

        logger.info(`[Subscription] ${planType} checkout session created for owner ${owner._id}`);
        res.json({ success: true, url: session.url, planType });
    } catch (error) {
        logger.error(`[Subscription] createCheckoutSession error: ${error.message}`);
        next(error);
    }
};


// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscription/create-portal-session
// Opens the Stripe Customer Portal so the owner can manage/cancel their plan.
// Falls back to Checkout if the user hasn't subscribed yet.
// ─────────────────────────────────────────────────────────────────────────────
exports.createPortalSession = async (req, res, next) => {
    try {
        const stripe = getStripe();

        const owner = await BusinessOwner
            .findById(req.user._id)
            .select('+subscription.stripeCustomerId');

        if (!owner) {
            return res.status(404).json({ success: false, message: 'Business owner not found' });
        }

        // No customer ID — route them to Checkout instead
        if (!owner.subscription?.stripeCustomerId) {
            logger.info(`[Subscription] No customer ID. Falling back to Checkout for owner ${owner._id}`);
            return exports.createCheckoutSession(req, res, next);
        }

        // Verify the customer ID exists in current Stripe mode (guard against test→live switch)
        try {
            await stripe.customers.retrieve(owner.subscription.stripeCustomerId);
        } catch (stripeErr) {
            if (stripeErr.code === 'resource_missing') {
                logger.warn(`[Subscription] Stale customer ID on portal. Clearing and falling back to Checkout.`);
                owner.subscription.stripeCustomerId = null;
                owner.subscription.stripeSubscriptionId = null;
                owner.subscription.status = 'inactive';
                await owner.save();
                // Fall through to Checkout so user can subscribe fresh in live mode
                return exports.createCheckoutSession(req, res, next);
            }
            throw stripeErr;
        }

        const portalSession = await stripe.billingPortal.sessions.create({
            customer: owner.subscription.stripeCustomerId,
            return_url: returnUrl,
        });

        logger.info(`[Subscription] Portal session created for owner ${owner._id}`);
        res.json({ success: true, url: portalSession.url });
    } catch (error) {
        logger.error(`[Subscription] createPortalSession error: ${error.message}`);
        next(error);
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/subscription/webhook  (raw body — NO JSON middleware here)
// Stripe posts signed events for every subscription lifecycle change.
// ALWAYS verify the signature — this is the security boundary.
// ─────────────────────────────────────────────────────────────────────────────
exports.handleWebhook = async (req, res) => {
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
        logger.error('[Subscription] STRIPE_WEBHOOK_SECRET is not set');
        return res.status(500).end();
    }

    const stripe = getStripe();
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,  // Must be raw Buffer — see server.js
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        logger.warn(`[Subscription] Webhook signature verification failed: ${err.message}`);
        return res.status(400).json({ error: `Webhook error: ${err.message}` });
    }

    logger.info(`[Subscription] Webhook event received: ${event.type}`);

    try {
        switch (event.type) {

            // ── Subscription activated / renewed / updated ────────────────────
            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const ownerId = subscription.metadata?.ownerId;

                if (!ownerId) {
                    logger.warn('[Subscription] Webhook missing ownerId metadata on subscription');
                    break;
                }

                const owner = await BusinessOwner
                    .findById(ownerId)
                    .select('+subscription.stripeCustomerId +subscription.stripeSubscriptionId +subscription.stripePriceId');

                if (!owner) {
                    logger.warn(`[Subscription] Owner ${ownerId} not found for subscription webhook`);
                    break;
                }

                owner.subscription.status = subscription.status;
                owner.subscription.stripeSubscriptionId = subscription.id;
                owner.subscription.stripeCustomerId = subscription.customer;
                owner.subscription.stripePriceId = subscription.items.data[0]?.price?.id || null;
                owner.subscription.plan = 'pro_monthly';
                owner.subscription.currentPeriodStart = new Date(subscription.current_period_start * 1000);
                owner.subscription.currentPeriodEnd = new Date(subscription.current_period_end * 1000);
                owner.subscription.cancelAtPeriodEnd = subscription.cancel_at_period_end;
                owner.subscription.trialEnd = subscription.trial_end
                    ? new Date(subscription.trial_end * 1000) : null;

                await owner.save();
                logger.info(`[Subscription] Owner ${ownerId} updated to: ${subscription.status}`);
                break;
            }

            // ── Checkout completed (first-time purchase) ──────────────────────
            case 'checkout.session.completed': {
                const session = event.data.object;
                if (session.mode !== 'subscription') break;

                const ownerId = session.metadata?.ownerId;
                if (!ownerId) {
                    logger.warn('[Subscription] checkout.session.completed missing ownerId metadata');
                    break;
                }

                const owner = await BusinessOwner
                    .findById(ownerId)
                    .select('+subscription.stripeCustomerId');

                if (!owner) break;

                // Persist the Stripe customer ID immediately (subscription.created follows)
                if (!owner.subscription.stripeCustomerId) {
                    owner.subscription.stripeCustomerId = session.customer;
                    await owner.save();
                }
                logger.info(`[Subscription] Checkout completed for owner ${ownerId}`);
                break;
            }

            // ── Subscription cancelled / expired ──────────────────────────────
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const ownerId = subscription.metadata?.ownerId;
                if (!ownerId) break;

                await BusinessOwner.findByIdAndUpdate(ownerId, {
                    'subscription.status': 'inactive',
                    'subscription.plan': null,
                    'subscription.stripeSubscriptionId': null,
                    'subscription.currentPeriodEnd': null,
                    'subscription.cancelAtPeriodEnd': false,
                });
                logger.info(`[Subscription] Owner ${ownerId} subscription cancelled`);
                break;
            }

            // ── Fix 4: Payment failed ─────────────────────────────────────────
            // stripeCustomerId is select:false, so we must use findOneAndUpdate
            // with $set, which bypasses Mongoose's field selection for update ops.
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;

                // findOneAndUpdate works directly on the raw field — no select() needed
                const result = await BusinessOwner.findOneAndUpdate(
                    { 'subscription.stripeCustomerId': customerId },
                    { $set: { 'subscription.status': 'past_due' } },
                    { new: false }  // Don't need the updated doc
                );

                if (result) {
                    logger.warn(`[Subscription] Payment failed for customer ${customerId} (owner: ${result._id})`);
                } else {
                    logger.warn(`[Subscription] Payment failed — no owner found for customer ${customerId}`);
                }
                break;
            }

            // ── Invoice paid — restore active status after past_due recovery ──
            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.billing_reason === 'subscription_create') break; // handled above
                const customerId = invoice.customer;

                await BusinessOwner.findOneAndUpdate(
                    { 'subscription.stripeCustomerId': customerId },
                    { $set: { 'subscription.status': 'active' } }
                );
                logger.info(`[Subscription] Payment recovered for customer ${customerId}`);
                break;
            }

            default:
                // Unhandled event types are fine
                break;
        }
    } catch (processingError) {
        logger.error(`[Subscription] Error processing ${event.type}: ${processingError.message}`);
        // Still return 200 to Stripe so it doesn't retry endlessly
    }

    res.status(200).json({ received: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/subscription/pricing?token=<jwt>  (NO auth middleware — public URL)
// Serves a self-contained HTML pricing page in the browser.
// User picks a plan → JS POST to checkout → redirect to Stripe Checkout.
// Fully browser-based. App Store & Play Store compliant.
// ─────────────────────────────────────────────────────────────────────────────
exports.getPricingPage = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#1e1b4b;color:#fff"><h2>Missing authentication token. Please re-open from the app.</h2></body></html>`);
    }

    try {
        verifyToken(token); // just validate — we don't need the payload for the page itself
    } catch {
        return res.status(401).send(`<html><body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#1e1b4b;color:#fff"><h2>Session expired. Please re-open from the app.</h2></body></html>`);
    }

    const apiBase = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    const plans = [
        { id: 'monthly', label: 'Monthly', badge: '', interval: '/ month', priceId: process.env.STRIPE_PRICE_ID_MONTHLY || process.env.STRIPE_PRICE_ID },
        { id: '6month', label: '6 Months', badge: 'Save More', interval: '/ 6 months', priceId: process.env.STRIPE_PRICE_ID_6MONTH },
        { id: 'yearly', label: 'Yearly', badge: 'Best Value', interval: '/ year', priceId: process.env.STRIPE_PRICE_ID_YEARLY, featured: true },
    ].filter(p => p.priceId);

    const stripe = getStripe();
    const plansWithPrices = await Promise.all(plans.map(async (plan) => {
        try {
            const price = await stripe.prices.retrieve(plan.priceId);
            const amount = (price.unit_amount / 100).toLocaleString('en-GB', {
                style: 'currency', currency: price.currency.toUpperCase(),
            });
            return { ...plan, amount };
        } catch {
            return { ...plan, amount: 'See price' };
        }
    }));

    const cards = plansWithPrices.map(p => `
        <div class="card${p.featured ? ' featured' : ''}" onclick="pick('${p.id}')">
            ${p.badge ? `<div class="badge">${p.badge}</div>` : '<div class="badge-empty"></div>'}
            <div class="plan-name">${p.label}</div>
            <div class="plan-price">${p.amount}</div>
            <div class="plan-int">${p.interval}</div>
            <button class="btn${p.featured ? ' btn-feat' : ''}" id="btn-${p.id}">Choose Plan</button>
        </div>`).join('');

    const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>HashView Pro — Choose Your Plan</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1e1b4b,#4c1d95);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px 16px}
.wrap{width:100%;max-width:480px}
.hdr{text-align:center;margin-bottom:28px}
.logo{font-size:26px;font-weight:800;color:#fff}.logo span{color:#a78bfa}
.sub{color:#c4b5fd;margin-top:6px;font-size:14px}
.cards{display:flex;flex-direction:column;gap:14px}
.card{background:rgba(255,255,255,.08);border:1.5px solid rgba(255,255,255,.15);border-radius:20px;padding:22px 20px;cursor:pointer;text-align:center;transition:transform .18s,background .18s}
.card:hover{background:rgba(255,255,255,.14);transform:translateY(-2px)}
.card.featured{background:rgba(124,58,237,.35);border-color:#7c3aed;box-shadow:0 8px 28px rgba(124,58,237,.4)}
.badge{display:inline-block;background:linear-gradient(90deg,#7c3aed,#4f46e5);color:#fff;font-size:11px;font-weight:700;padding:3px 12px;border-radius:20px;margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px}
.badge-empty{height:24px;margin-bottom:10px}
.plan-name{font-size:17px;font-weight:700;color:#fff;margin-bottom:4px}
.plan-price{font-size:30px;font-weight:800;color:#fff;margin-bottom:2px}
.plan-int{font-size:12px;color:#a78bfa;margin-bottom:18px}
.btn{width:100%;padding:12px;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;background:rgba(255,255,255,.15);color:#fff;transition:background .15s}
.btn:hover{background:rgba(255,255,255,.25)}
.btn.btn-feat{background:linear-gradient(90deg,#7c3aed,#4f46e5);box-shadow:0 4px 14px rgba(124,58,237,.5)}
.btn:disabled{opacity:.55;cursor:not-allowed}
.note{text-align:center;color:#7c6fad;font-size:12px;margin-top:20px;line-height:1.6}
#err{color:#f87171;text-align:center;margin-top:12px;font-size:13px;display:none}
.spin{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:s .7s linear infinite;vertical-align:middle;margin-right:5px}
@keyframes s{to{transform:rotate(360deg)}}
</style></head><body>
<div class="wrap">
  <div class="hdr"><div class="logo">Hash<span>View</span> Pro</div><div class="sub">Unlock all premium features for your business</div></div>
  <div class="cards">${cards}</div>
  <div id="err"></div>
  <div class="note">Secure payment by Stripe · Cancel anytime<br>Manage your plan anytime from the app</div>
</div>
<script>
const API='${apiBase}',TOKEN='${token}';
async function pick(plan){
  const btn=document.getElementById('btn-'+plan);
  if(btn.disabled)return;
  document.querySelectorAll('.btn').forEach(b=>b.disabled=true);
  btn.innerHTML='<span class="spin"></span>Loading…';
  document.getElementById('err').style.display='none';
  try{
    const r=await fetch(API+'/api/subscription/create-checkout-session',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+TOKEN},body:JSON.stringify({planType:plan})});
    const d=await r.json();
    if(d.url)window.location.href=d.url;
    else throw new Error(d.message||'Could not start checkout');
  }catch(e){
    document.querySelectorAll('.btn').forEach(b=>b.disabled=false);
    btn.textContent='Choose Plan';
    const el=document.getElementById('err');
    el.textContent=e.message;el.style.display='block';
  }
}
</script></body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
};

