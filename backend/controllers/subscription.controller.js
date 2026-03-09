const Stripe = require('stripe');
const BusinessOwner = require('../models/BusinessOwner.model');
const logger = require('../utils/logger');

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

        // ── Fix 3: Idempotency key prevents duplicate customers on retries ───
        let customerId = owner.subscription?.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create(
                {
                    email: owner.email,
                    name: owner.name,
                    metadata: { ownerId: owner._id.toString() },
                },
                { idempotencyKey: `customer-create-${owner._id.toString()}` }
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

        // No customer ID → they've never paid → redirect to Checkout instead
        if (!owner.subscription?.stripeCustomerId) {
            logger.info(`[Subscription] No customer ID. Falling back to Checkout for owner ${owner._id}`);
            return exports.createCheckoutSession(req, res, next);
        }

        const returnUrl = process.env.APP_DEEP_LINK_BASE
            ? `${process.env.APP_DEEP_LINK_BASE}://subscription-portal-return`
            : `${process.env.BACKEND_URL || 'https://hashview.app'}/subscription/return`;

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
