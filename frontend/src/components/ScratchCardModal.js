import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Dimensions,
    PanResponder,
    Animated,
    TouchableOpacity,
    Vibration,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

// HashView brand colors (extracted from logo)
const BRAND = {
    purple: '#2D0057',
    deepPurple: '#1A0033',
    orange: '#FF8C00',
    orangeLight: '#FFA940',
    magenta: '#BB44CC',
    white: '#FFFFFF',
    cardBg: '#F9F0FF',
};

const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = CARD_WIDTH * 1.15;

// Smaller grid = smoother performance
const ROWS = 5;
const COLS = 5;
const TOTAL_CELLS = ROWS * COLS;
const CELL_WIDTH = CARD_WIDTH / COLS;
const CELL_HEIGHT = CARD_HEIGHT / ROWS;
const REVEAL_THRESHOLD = 0.38; // 38% scratched reveals the rest

// Grid cell scratch radius (scratch surrounding cells too for a brush feel)
const BRUSH_RADIUS = 1;

const ScratchCardModal = ({ visible, onClose, coupon, isNearbyCoupon, couponBusinessName }) => {
    const [revealed, setRevealed] = useState(false);
    const [scratchedCount, setScratchedCount] = useState(0);
    const [scratchProgress, setScratchProgress] = useState(0); // 0-1

    const cellOpacities = useRef(
        Array(TOTAL_CELLS).fill(0).map(() => new Animated.Value(1))
    ).current;

    const scratchedCells = useRef(new Set()).current;

    const cardScale = useRef(new Animated.Value(0.85)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const shineAnim = useRef(new Animated.Value(-CARD_WIDTH)).current;
    const revealScale = useRef(new Animated.Value(0.7)).current;
    const confettiAnim = useRef(new Animated.Value(0)).current;

    // Card Y-offset ref so we can calculate real touch position
    const cardYOffset = useRef(0);
    const cardXOffset = useRef((width - CARD_WIDTH) / 2);

    useEffect(() => {
        if (visible) {
            resetCard();
            // Entrance animation
            Animated.parallel([
                Animated.spring(cardScale, {
                    toValue: 1,
                    friction: 7,
                    tension: 60,
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity, {
                    toValue: 1,
                    duration: 280,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                // Shine sweep animation on entry
                Animated.timing(shineAnim, {
                    toValue: CARD_WIDTH * 2,
                    duration: 800,
                    useNativeDriver: true,
                }).start();
            });
        }
    }, [visible]);

    useEffect(() => {
        const progress = scratchedCount / TOTAL_CELLS;
        setScratchProgress(progress);
        if (!revealed && progress > REVEAL_THRESHOLD) {
            revealAll();
        }
    }, [scratchedCount]);

    const resetCard = () => {
        setRevealed(false);
        setScratchedCount(0);
        setScratchProgress(0);
        scratchedCells.clear();
        cellOpacities.forEach(a => a.setValue(1));
        cardScale.setValue(0.85);
        cardOpacity.setValue(0);
        shineAnim.setValue(-CARD_WIDTH);
        revealScale.setValue(0.7);
        confettiAnim.setValue(0);
    };

    const revealAll = () => {
        setRevealed(true);
        Vibration.vibrate([0, 30, 80, 50]);

        // Fade out all remaining cells quickly
        Animated.stagger(8,
            cellOpacities.map(anim =>
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                })
            )
        ).start();

        // Animate the reward reveal
        Animated.sequence([
            Animated.delay(250),
            Animated.spring(revealScale, {
                toValue: 1,
                friction: 5,
                tension: 80,
                useNativeDriver: true,
            }),
            Animated.timing(confettiAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                if (!revealed) handleScratchPoint(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
            },
            onPanResponderMove: (evt) => {
                if (!revealed) handleScratchPoint(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
            },
        })
    ).current;

    const handleScratchPoint = (pageX, pageY) => {
        const localX = pageX - cardXOffset.current;
        const localY = pageY - cardYOffset.current;

        const centerCol = Math.floor(localX / CELL_WIDTH);
        const centerRow = Math.floor(localY / CELL_HEIGHT);

        // Scratch a brush area around the touch point
        for (let dr = -BRUSH_RADIUS; dr <= BRUSH_RADIUS; dr++) {
            for (let dc = -BRUSH_RADIUS; dc <= BRUSH_RADIUS; dc++) {
                const col = centerCol + dc;
                const row = centerRow + dr;
                if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
                    const index = row * COLS + col;
                    if (!scratchedCells.has(index)) {
                        scratchedCells.add(index);
                        setScratchedCount(prev => prev + 1);
                        Animated.timing(cellOpacities[index], {
                            toValue: 0,
                            duration: 100,
                            useNativeDriver: true,
                        }).start();
                    }
                }
            }
        }
    };

    const getRewardText = () => {
        if (!coupon) return 'SORRY!';
        if (coupon.rewardType === 'percentage') return `${coupon.title || `${coupon.rewardValue}% OFF`}`;
        if (coupon.rewardType === 'fixed') return `${coupon.title || `₹${coupon.rewardValue} OFF`}`;
        if (coupon.rewardType === 'free_item' || coupon.rewardType === 'free_drink') return `${coupon.title || `FREE: ${coupon.itemName || 'ITEM'}`}`;
        if (coupon.rewardType === 'buy1get1') return `${coupon.title || 'BUY 1 GET 1'}`;
        return coupon.title || 'FREE GIFT';
    };

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            {/* Blurred dark overlay with radial purple glow */}
            <LinearGradient
                colors={['rgba(29,0,51,0.92)', 'rgba(10,0,30,0.96)']}
                style={styles.overlay}
            >
                <Animated.View
                    style={[
                        styles.container,
                        { opacity: cardOpacity, transform: [{ scale: cardScale }] }
                    ]}
                >
                    {/* ── Header ── */}
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerEmoji}>🎉</Text>
                        <Text style={styles.headerLabel}>YOU EARNED A REWARD</Text>
                        <Text style={styles.headerEmoji}>🎉</Text>
                    </View>
                    <Text style={styles.subtitle}>Scratch the card to reveal your prize</Text>

                    {/* ── Card ── */}
                    <View
                        style={styles.cardWrapper}
                        onLayout={e => {
                            cardYOffset.current = e.nativeEvent.layout.y
                                + (e.nativeEvent.layout.height - CARD_HEIGHT) / 2;
                        }}
                    >
                        {/* Back Layer – Revealed Reward */}
                        <LinearGradient
                            colors={[BRAND.cardBg, '#EDD5FF', BRAND.cardBg]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.rewardLayer}
                        >
                            {/* Decorative arcs (brand-style) */}
                            <View style={styles.decorTopLeft} />
                            <View style={styles.decorBottomRight} />

                            <Animated.View
                                style={[
                                    styles.rewardContent,
                                    { transform: [{ scale: revealed ? revealScale : 1 }] }
                                ]}
                            >
                                {/* Icon ring */}
                                <LinearGradient
                                    colors={coupon ? [BRAND.orange, BRAND.magenta] : ['#9CA3AF', '#6B7280']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.iconRing}
                                >
                                    <View style={styles.iconInner}>
                                        <Ionicons name={coupon ? "gift" : "sad-outline"} size={36} color={coupon ? BRAND.orange : "#6B7280"} />
                                    </View>
                                </LinearGradient>

                                {/* Reward value – big, bold */}
                                <Text style={styles.rewardValue}>{getRewardText()}</Text>

                                {coupon ? (
                                    <>
                                        {/* Show which business this coupon is from */}
                                        {isNearbyCoupon && couponBusinessName ? (
                                            <View style={styles.nearbyBadge}>
                                                <Ionicons name="storefront-outline" size={13} color={BRAND.orange} />
                                                <Text style={styles.nearbyBadgeText}>Reward from {couponBusinessName}</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.nearbyBadge}>
                                                <Ionicons name="storefront-outline" size={13} color={BRAND.orange} />
                                                <Text style={styles.nearbyBadgeText}>
                                                    {coupon?.business?.name || couponBusinessName || ''}
                                                </Text>
                                            </View>
                                        )}

                                        <Text style={styles.rewardDesc}>
                                            {coupon.description || 'On your next visit!'}
                                        </Text>

                                        {/* Coupon code box */}
                                        <View style={styles.codeBox}>
                                            <Text style={styles.codeLabel}>COUPON CODE</Text>
                                            <Text style={styles.codeText}>{coupon.code}</Text>
                                        </View>

                                        {/* Coupon Additional Details */}
                                        <View style={styles.detailsBox}>
                                            <View style={styles.validityRow}>
                                                <Ionicons name="time-outline" size={12} color={BRAND.orange} />
                                                <Text style={styles.expiryText}>
                                                    {coupon.validUntil ? `  Valid until: ${new Date(coupon.validUntil).toLocaleDateString()}` : '  Valid for 2 hours'}
                                                </Text>
                                            </View>

                                            {coupon.minPurchaseAmount > 0 && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="cart-outline" size={12} color={BRAND.orange} />
                                                    <Text style={styles.detailText}>  Min. Purchase: ₹{coupon.minPurchaseAmount}</Text>
                                                </View>
                                            )}
                                            {coupon.maxDiscountAmount > 0 && coupon.rewardType === 'percentage' && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="pricetag-outline" size={12} color={BRAND.orange} />
                                                    <Text style={styles.detailText}>  Max Discount: ₹{coupon.maxDiscountAmount}</Text>
                                                </View>
                                            )}
                                            {coupon.terms && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="document-text-outline" size={12} color={BRAND.orange} />
                                                    <Text style={styles.detailText} numberOfLines={2}>  {coupon.terms}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </>
                                ) : (
                                    <View style={{ alignItems: 'center', marginTop: 15, paddingHorizontal: 20 }}>
                                        <Text style={[styles.rewardDesc, { fontSize: 14, marginTop: 5 }]}>
                                            Better luck next time!
                                        </Text>
                                    </View>
                                )}
                            </Animated.View>
                        </LinearGradient>

                        {/* Front Layer – Scratch surface */}
                        <View
                            style={[styles.scratchLayer, revealed && { pointerEvents: 'none' }]}
                            {...panResponder.panHandlers}
                        >
                            {/* Grid mask cells */}
                            <View style={styles.grid}>
                                {cellOpacities.map((opacity, index) => (
                                    <Animated.View
                                        key={index}
                                        style={{ opacity, width: CELL_WIDTH, height: CELL_HEIGHT }}
                                    >
                                        <LinearGradient
                                            colors={
                                                index % 3 === 0
                                                    ? [BRAND.purple, BRAND.magenta]
                                                    : index % 3 === 1
                                                        ? [BRAND.deepPurple, BRAND.purple]
                                                        : [BRAND.magenta, BRAND.orange]
                                            }
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        {/* Subtle sparkle pattern */}
                                        {index % 6 === 0 && (
                                            <Text style={styles.sparkle}>✦</Text>
                                        )}
                                    </Animated.View>
                                ))}
                            </View>

                            {/* "Scratch Here" hint – visible before user starts */}
                            {!revealed && scratchProgress < 0.05 && (
                                <View style={styles.scratchHint} pointerEvents="none">
                                    <View style={styles.scratchHintInner}>
                                        <Text style={styles.fingerEmoji}>👆</Text>
                                        <Text style={styles.scratchText}>Scratch Here!</Text>
                                        <View style={styles.scratchArrows}>
                                            <Text style={styles.arrowText}>← Swipe →</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Progress dots along the bottom while scratching */}
                            {!revealed && scratchProgress >= 0.05 && (
                                <View style={styles.progressRow} pointerEvents="none">
                                    {Array(5).fill(0).map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.progressDot,
                                                { backgroundColor: scratchProgress > (i + 1) / 5 ? BRAND.orange : 'rgba(255,255,255,0.4)' }
                                            ]}
                                        />
                                    ))}
                                </View>
                            )}

                            {/* Shine sweep on entry */}
                            <Animated.View
                                style={[styles.shine, { transform: [{ translateX: shineAnim }] }]}
                                pointerEvents="none"
                            />
                        </View>
                    </View>

                    {/* ── CTA Button ── */}
                    <TouchableOpacity
                        onPress={onClose}
                        activeOpacity={0.85}
                        style={styles.ctaWrapper}
                    >
                        <LinearGradient
                            colors={revealed ? [BRAND.orange, '#FF6B00'] : ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.10)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.ctaButton}
                        >
                            <Text style={[styles.ctaText, !revealed && { color: 'rgba(255,255,255,0.8)' }]}>
                                {revealed ? (coupon ? '🎁  Claim Reward' : 'Got it') : 'Close'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Small brand note */}
                    <Text style={styles.brandNote}>HashView • Rewards</Text>
                </Animated.View>
            </LinearGradient>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.95,
        alignItems: 'center',
    },

    // Header
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,140,0,0.18)',
        borderWidth: 1,
        borderColor: 'rgba(255,140,0,0.45)',
        borderRadius: 50,
        paddingHorizontal: 18,
        paddingVertical: 6,
        marginBottom: 10,
    },
    headerEmoji: { fontSize: 16 },
    headerLabel: {
        fontSize: 13,
        fontWeight: '800',
        color: BRAND.orangeLight,
        letterSpacing: 1.5,
        marginHorizontal: 8,
    },
    subtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        marginBottom: 18,
        letterSpacing: 0.3,
    },

    // Card wrapper
    cardWrapper: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 20,
        shadowColor: BRAND.magenta,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        // Purple glowing border
        borderWidth: 2,
        borderColor: 'rgba(187,68,204,0.7)',
    },

    // Back reward layer
    rewardLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    decorTopLeft: {
        position: 'absolute',
        top: -30,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(187,68,204,0.15)',
    },
    decorBottomRight: {
        position: 'absolute',
        bottom: -40,
        right: -40,
        width: 130,
        height: 130,
        borderRadius: 65,
        backgroundColor: 'rgba(255,140,0,0.1)',
    },
    rewardContent: {
        alignItems: 'center',
        width: '100%',
    },
    iconRing: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    iconInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF8F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rewardValue: {
        fontSize: 42,
        fontWeight: '900',
        color: BRAND.purple,
        marginBottom: 6,
        letterSpacing: -1,
        textShadowColor: 'rgba(187,68,204,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    rewardDesc: {
        fontSize: 13,
        color: '#555',
        textAlign: 'center',
        marginBottom: 18,
        lineHeight: 18,
        paddingHorizontal: 10,
    },
    codeBox: {
        backgroundColor: BRAND.purple,
        paddingVertical: 10,
        paddingHorizontal: 22,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
        width: '100%',
        shadowColor: BRAND.purple,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 6,
    },
    codeLabel: {
        fontSize: 9,
        color: 'rgba(255,255,255,0.6)',
        letterSpacing: 2,
        marginBottom: 2,
        fontWeight: '700',
    },
    codeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: BRAND.orangeLight,
        letterSpacing: 3,
    },
    validityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expiryText: {
        fontSize: 11,
        color: '#888',
        fontStyle: 'italic',
    },
    nearbyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,140,0,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(255,140,0,0.35)',
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 4,
        marginBottom: 10,
        maxWidth: '100%',
    },
    nearbyBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: BRAND.orange,
        marginLeft: 5,
        flexShrink: 1,
    },

    // Front scratch layer
    scratchLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
    },
    sparkle: {
        position: 'absolute',
        top: '35%',
        left: '35%',
        fontSize: 10,
        color: 'rgba(255,255,255,0.35)',
    },

    // Scratch hint overlay
    scratchHint: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scratchHintInner: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.35)',
        paddingHorizontal: 28,
        paddingVertical: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    fingerEmoji: {
        fontSize: 36,
        marginBottom: 6,
    },
    scratchText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 6,
    },
    scratchArrows: {
        marginTop: 6,
    },
    arrowText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        letterSpacing: 1,
    },

    // Progress
    progressRow: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },

    // Shine effect
    shine: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 60,
        backgroundColor: 'rgba(255,255,255,0.12)',
        transform: [{ skewX: '-20deg' }],
    },

    // CTA Button
    ctaWrapper: {
        marginTop: 22,
        width: CARD_WIDTH,
        borderRadius: 50,
        overflow: 'hidden',
    },
    ctaButton: {
        paddingVertical: 15,
        alignItems: 'center',
        borderRadius: 50,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    ctaText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 0.5,
    },

    brandNote: {
        marginTop: 14,
        fontSize: 11,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 2,
        fontWeight: '600',
    },
    detailsBox: {
        marginTop: 10,
        backgroundColor: 'rgba(255,140,0,0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        width: '100%',
        alignItems: 'flex-start',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    detailText: {
        fontSize: 11,
        color: '#666',
        flexShrink: 1,
    }
});

export default ScratchCardModal;
