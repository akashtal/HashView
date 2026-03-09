import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Linking,
    ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSelector, useDispatch } from 'react-redux';
import Toast from 'react-native-toast-message';
import ApiService from '../services/api.service';
import { checkSubscriptionStatus } from '../store/slices/authSlice';

/**
 * ProGate
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps any screen that requires an active Pro subscription.
 *
 * - isPro === true  → renders children normally
 * - isPro === false → renders a paywall with a single "Manage Subscription"
 *                    button that opens the browser (Stripe hosted pages)
 *
 * All payment flows, plan selection, billing history, and cancellation happen
 * exclusively in the browser via Stripe — fully compliant with App Store and
 * Google Play guidelines.
 */
const ProGate = ({ children, feature = 'This feature' }) => {
    const dispatch = useDispatch();
    const { isPro, subscription } = useSelector((s) => s.auth);

    const [loading, setLoading] = useState(false);

    const handleManageSubscription = useCallback(async () => {
        setLoading(true);
        try {
            // isPro=true → Customer Portal (manage/cancel/view invoices)
            // isPro=false → Checkout to start a new subscription
            const data = isPro
                ? await ApiService.createSubscriptionPortal()
                : await ApiService.createSubscriptionCheckout();

            if (!data?.url) throw new Error('Could not generate subscription page URL');

            await Linking.openURL(data.url);

            Toast.show({
                type: 'info',
                text1: 'Checking your subscription…',
                text2: 'Please wait a moment.',
                visibilityTime: 3000,
            });

            // Refresh status after returning — allows webhook time to process
            setTimeout(async () => {
                const result = await dispatch(checkSubscriptionStatus());
                if (result?.payload?.isPro) {
                    Toast.show({
                        type: 'success',
                        text1: '🎉 Pro Unlocked!',
                        text2: 'All premium features are now active.',
                        visibilityTime: 4000,
                    });
                }
            }, 3500);
        } catch (err) {
            Alert.alert('Subscription', err.message || 'Unable to open the subscription page. Please try again.');
        } finally {
            setLoading(false);
        }
    }, [dispatch, isPro]);

    // Already subscribed → render content
    if (isPro) return children;

    // Not subscribed → render paywall
    return (
        <View style={styles.container}>
            <LinearGradient colors={['#f5f3ff', '#ede9fe']} style={styles.card}>

                {/* Lock icon */}
                <View style={styles.iconWrap}>
                    <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.iconGradient}>
                        <Ionicons name="lock-closed" size={32} color="#fff" />
                    </LinearGradient>
                </View>

                {/* Title */}
                <Text style={styles.title}>Pro Feature</Text>
                <Text style={styles.featureName}>{feature}</Text>

                {/* Description */}
                <Text style={styles.description}>
                    This feature is available exclusively with a{' '}
                    <Text style={styles.bold}>HashView Pro</Text> subscription.
                    {'\n\n'}
                    Tap the button below to subscribe or manage your plan.
                </Text>

                {/* Pro feature list */}
                {PRO_FEATURES.map((f) => (
                    <View key={f} style={styles.featureRow}>
                        <Ionicons name="checkmark-circle" size={18} color="#7C3AED" style={styles.check} />
                        <Text style={styles.featureText}>{f}</Text>
                    </View>
                ))}

                {/* Single CTA button */}
                <TouchableOpacity
                    style={styles.button}
                    onPress={handleManageSubscription}
                    disabled={loading}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#7C3AED', '#4F46E5']}
                        style={styles.buttonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <>
                                <Ionicons name="open-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.buttonText}>Manage Subscription</Text>
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.hint}>
                    Already subscribed? Tap above to activate your Pro features.
                </Text>
            </LinearGradient>
        </View>
    );
};

const PRO_FEATURES = [
    'Advanced Analytics & Revenue Reports',
    'Unlimited Coupon & Offer Management',
    'Priority Business Updates & Posts',
    'QR Code Scanner for Coupon Redemptions',
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f7ff',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    card: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        shadowColor: '#7C3AED',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 8,
    },
    iconWrap: { marginBottom: 20, borderRadius: 50, overflow: 'hidden' },
    iconGradient: {
        width: 72,
        height: 72,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1e1b4b',
        marginBottom: 4,
        letterSpacing: -0.3,
    },
    featureName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#7C3AED',
        marginBottom: 16,
        textAlign: 'center',
    },
    description: {
        fontSize: 14,
        color: '#4b5563',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    bold: { fontWeight: '700', color: '#1e1b4b' },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
    },
    check: { marginRight: 10 },
    featureText: { fontSize: 13, color: '#374151', flex: 1 },
    button: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        marginTop: 20,
        marginBottom: 14,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
    },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    hint: {
        fontSize: 12,
        color: '#9ca3af',
        textAlign: 'center',
        lineHeight: 18,
    },
});

export default ProGate;
