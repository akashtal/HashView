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
import Svg, { Defs, Mask, Rect, Path, G, LinearGradient as SvgLinearGradient, Stop, Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

// ─── Brand Colors ──────────────────────────────────────────────────────────
const BRAND = {
    purple: '#2D0057',
    deepPurple: '#1A0033',
    orange: '#FF8C00',
    orangeLight: '#FFA940',
    magenta: '#BB44CC',
    yellow: '#FFD700',
    yellowLight: '#FFE566',
    white: '#FFFFFF',
    cardBg: '#F9F0FF',
};

// ─── Card dimensions ────────────────────────────────────────────────────────
const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = CARD_WIDTH * 1.15;

// ─── Scratch configuration ──────────────────────────────────────────────────
const REVEAL_THRESHOLD = 0.40; // reveal when 40% is scratched
const STROKE_WIDTH = 45;       // thickness of the scratch brush

// ─── Progress Logic Grid ────────────────────────────────────────────────────
// An invisible grid to efficiently calculate "percentage scratched" in memory
const LOGIC_COLS = 15;
const LOGIC_ROWS = 15;
const LOGIC_TOTAL = LOGIC_COLS * LOGIC_ROWS;
const LOGIC_CELL_W = CARD_WIDTH / LOGIC_COLS;
const LOGIC_CELL_H = CARD_HEIGHT / LOGIC_ROWS;

// ─── Decorative dot positions (relative to card dimensions) ─────────────────
const DECOR_DOTS = [
    { x: 0.08, y: 0.08, r: 3, o: 0.5 },
    { x: 0.18, y: 0.08, r: 2, o: 0.35 },
    { x: 0.04, y: 0.15, r: 2, o: 0.3 },
    { x: 0.92, y: 0.06, r: 3, o: 0.5 },
    { x: 0.82, y: 0.06, r: 2, o: 0.35 },
    { x: 0.96, y: 0.14, r: 2, o: 0.3 },
    { x: 0.08, y: 0.92, r: 3, o: 0.5 },
    { x: 0.18, y: 0.92, r: 2, o: 0.35 },
    { x: 0.92, y: 0.94, r: 3, o: 0.5 },
    { x: 0.82, y: 0.94, r: 2, o: 0.35 },
    { x: 0.06, y: 0.45, r: 2.5, o: 0.4 },
    { x: 0.94, y: 0.45, r: 2.5, o: 0.4 },
    // cross/star dots approximations
    { x: 0.12, y: 0.25, r: 1.5, o: 0.45 },
    { x: 0.12, y: 0.70, r: 1.5, o: 0.45 },
    { x: 0.88, y: 0.25, r: 1.5, o: 0.45 },
    { x: 0.88, y: 0.70, r: 1.5, o: 0.45 },
];

// SVG Path for Gift Icon (24x24 viewBox equivalent)
const GIFT_PATH = "M22 6h-4.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.07 0-2.06.5-2.65 1.25C11.89 2.5 10.9 2 9.83 2 8.17 2 6.83 3.34 6.83 5c0 .35.07.69.18 1H3c-1.11 0-2 .89-2 2v3c0 1.11.89 2 2 2v9c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-9c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-7 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-6 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zM3 8h7v3H3V8zm2 13v-9h5v9H5zm14 0h-5v-9h5v9zm0-11h-7V8h7v3z";

const ScratchCardModal = ({ visible, onClose, coupon, isNearbyCoupon, couponBusinessName }) => {
    // UI State
    const [revealed, setRevealed] = useState(false);
    const [scratchProgress, setScratchProgress] = useState(0);
    const [pathData, setPathData] = useState('');

    // Refs for performant updates without constant re-renders
    const revealedRef = useRef(false);
    const pathRef = useRef('');
    const scratchedLogicCells = useRef(new Set());
    const lastUpdate = useRef(0);
    const hintHidden = useRef(false);

    // Layout Offsets
    const cardYOffset = useRef(0);
    const cardXOffset = useRef((width - CARD_WIDTH) / 2);

    // Animations
    const cardScale = useRef(new Animated.Value(0.85)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;
    const revealScale = useRef(new Animated.Value(0.7)).current;

    // Cover Fade out
    const coverOpacity = useRef(new Animated.Value(1)).current;
    const shineAnim = useRef(new Animated.Value(-CARD_WIDTH)).current;
    const shineOpacity = useRef(new Animated.Value(1)).current;
    const hintOpacity = useRef(new Animated.Value(1)).current;
    const hintPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(hintPulse, { toValue: 1.08, duration: 700, useNativeDriver: true }),
                Animated.timing(hintPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    useEffect(() => {
        if (visible) {
            resetCard();
            Animated.parallel([
                Animated.spring(cardScale, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }),
                Animated.timing(cardOpacity, { toValue: 1, duration: 280, useNativeDriver: true }),
            ]).start(() => {
                // Shine sweep on entry
                Animated.timing(shineAnim, {
                    toValue: CARD_WIDTH * 2,
                    duration: 900,
                    useNativeDriver: true,
                }).start(() => {
                    // Loop shine every 6s unless hidden
                    Animated.loop(
                        Animated.sequence([
                            Animated.delay(5000),
                            Animated.timing(shineAnim, {
                                toValue: CARD_WIDTH * 2,
                                duration: 900,
                                useNativeDriver: true,
                            }),
                        ])
                    ).start();
                });
            });
        }
    }, [visible]);

    const resetCard = () => {
        setRevealed(false);
        setScratchProgress(0);
        setPathData('');

        revealedRef.current = false;
        pathRef.current = '';
        scratchedLogicCells.current.clear();
        hintHidden.current = false;
        lastUpdate.current = 0;

        cardScale.setValue(0.85);
        cardOpacity.setValue(0);
        revealScale.setValue(0.7);
        coverOpacity.setValue(1);
        hintOpacity.setValue(1);
        shineOpacity.setValue(1);
        shineAnim.setValue(-CARD_WIDTH);
    };

    const runRevealAnimation = () => {
        revealedRef.current = true;
        Vibration.vibrate([0, 30, 80, 50]);

        // Smoothly fade out the entire SVG cover
        Animated.timing(coverOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start(() => {
            setRevealed(true);
        });

        // Pop the reward layer
        Animated.sequence([
            Animated.delay(100),
            Animated.spring(revealScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        ]).start();
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                if (revealedRef.current) return;
                const { localX, localY } = getLocalCoords(evt);
                // Starting a new path + single tap support
                pathRef.current += ` M ${localX} ${localY} L ${localX} ${localY}`;
                setPathData(pathRef.current);
                updateLogicBox(localX, localY);
                hideHints();
            },
            onPanResponderMove: (evt) => {
                if (revealedRef.current) return;
                const { localX, localY } = getLocalCoords(evt);
                pathRef.current += ` L ${localX} ${localY}`;

                // Throttle React state updates to ~60fps for performance
                const now = Date.now();
                if (now - lastUpdate.current > 16) {
                    setPathData(pathRef.current);
                    lastUpdate.current = now;
                }
                updateLogicBox(localX, localY);
            },
            onPanResponderRelease: () => {
                // Flush final path state
                if (!revealedRef.current) setPathData(pathRef.current);
            }
        })
    ).current;

    const getLocalCoords = (evt) => {
        return {
            localX: evt.nativeEvent.pageX - cardXOffset.current,
            localY: evt.nativeEvent.pageY - cardYOffset.current,
        };
    };

    const updateLogicBox = (x, y) => {
        const col = Math.floor(x / LOGIC_CELL_W);
        const row = Math.floor(y / LOGIC_CELL_H);

        let newScratch = false;
        // Check surrounding logical grid cells (roughly the brush width)
        for (let r = -1; r <= 1; r++) {
            for (let c = -1; c <= 1; c++) {
                const r2 = row + r, c2 = col + c;
                if (r2 >= 0 && r2 < LOGIC_ROWS && c2 >= 0 && c2 < LOGIC_COLS) {
                    const idx = r2 * LOGIC_COLS + c2;
                    if (!scratchedLogicCells.current.has(idx)) {
                        scratchedLogicCells.current.add(idx);
                        newScratch = true;
                    }
                }
            }
        }

        if (newScratch && !revealedRef.current) {
            const prog = scratchedLogicCells.current.size / LOGIC_TOTAL;
            setScratchProgress(prog);
            if (prog >= REVEAL_THRESHOLD) {
                runRevealAnimation();
            }
        }
    };

    const hideHints = () => {
        if (!hintHidden.current) {
            hintHidden.current = true;
            Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
            Animated.timing(shineOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        }
    };

    const getRewardText = () => {
        if (!coupon) return 'SORRY!';
        if (coupon.rewardType === 'percentage') return coupon.title || `${coupon.rewardValue}% OFF`;
        if (coupon.rewardType === 'fixed') return coupon.title || `£${coupon.rewardValue} OFF`;
        if (coupon.rewardType === 'free_item' || coupon.rewardType === 'free_drink')
            return coupon.title || `FREE: ${coupon.itemName || 'ITEM'}`;
        if (coupon.rewardType === 'buy1get1') return coupon.title || 'BUY 1 GET 1';
        return coupon.title || 'FREE GIFT';
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
            <LinearGradient colors={['rgba(29,0,51,0.94)', 'rgba(10,0,30,0.97)']} style={styles.overlay}>
                <Animated.View style={[styles.container, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>

                    {/* ── Header Badge ── */}
                    <View style={styles.headerBadge}>
                        <Text style={styles.headerEmoji}>🎉</Text>
                        <Text style={styles.headerLabel}>YOU EARNED A REWARD</Text>
                        <Text style={styles.headerEmoji}>🎉</Text>
                    </View>
                    <Text style={styles.subtitle}>Scratch the card to reveal your prize</Text>

                    {/* ── Card Container ── */}
                    <View
                        style={styles.cardWrapper}
                        onLayout={e => {
                            cardYOffset.current = e.nativeEvent.layout.y + (e.nativeEvent.layout.height - CARD_HEIGHT) / 2;
                        }}
                    >
                        {/* ── BACK LAYER: Revealed Reward ── */}
                        <LinearGradient
                            colors={[BRAND.cardBg, '#EDD5FF', BRAND.cardBg]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.rewardLayer}
                        >
                            <View style={styles.decorTopLeft} />
                            <View style={styles.decorBottomRight} />

                            <Animated.View style={[styles.rewardContent, { transform: [{ scale: revealScale }] }]}>
                                <LinearGradient
                                    colors={coupon ? [BRAND.orange, BRAND.magenta] : ['#9CA3AF', '#6B7280']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                    style={styles.iconRing}
                                >
                                    <View style={styles.iconInner}>
                                        <Ionicons name={coupon ? 'gift' : 'sad-outline'} size={36} color={coupon ? BRAND.orange : '#6B7280'} />
                                    </View>
                                </LinearGradient>

                                <Text style={styles.rewardValue}>{getRewardText()}</Text>

                                {coupon ? (
                                    <>
                                        {(isNearbyCoupon && couponBusinessName) ? (
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

                                        <Text style={styles.rewardDesc}>{coupon.description || 'On your next visit!'}</Text>

                                        <View style={styles.codeBox}>
                                            <Text style={styles.codeLabel}>COUPON CODE</Text>
                                            <Text style={styles.codeText}>{coupon.code}</Text>
                                        </View>

                                        <View style={styles.detailsBox}>
                                            <View style={styles.validityRow}>
                                                <Ionicons name="time-outline" size={12} color={BRAND.orange} />
                                                <Text style={styles.expiryText}>
                                                    {coupon.validUntil
                                                        ? `  Valid until: ${new Date(coupon.validUntil).toLocaleDateString()}`
                                                        : '  No expiry'}
                                                </Text>
                                            </View>
                                            {coupon.minPurchaseAmount > 0 && (
                                                <View style={styles.detailRow}>
                                                    <Ionicons name="cart-outline" size={12} color={BRAND.orange} />
                                                    <Text style={styles.detailText}>  Min. Purchase: £{coupon.minPurchaseAmount}</Text>
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

                        {/* ── FRONT LAYER: Smooth SVG Scrub Mask ── */}
                        {/* We use Animated.View so we can fade out the un-scratched residue smoothly upon revealing */}
                        {!revealed && (
                            <Animated.View
                                style={[styles.scratchLayer, { opacity: coverOpacity }]}
                                {...panResponder.panHandlers}
                            >
                                <Svg width={CARD_WIDTH} height={CARD_HEIGHT}>
                                    <Defs>
                                        <Mask id="scratchMask">
                                            {/* White background = fully visible cover */}
                                            <Rect x="0" y="0" width="100%" height="100%" fill="white" />
                                            {/* Black path = erased/transparent scratched area */}
                                            <Path
                                                d={pathData}
                                                stroke="black"
                                                strokeWidth={STROKE_WIDTH}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                fill="none"
                                            />
                                        </Mask>

                                        <SvgLinearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
                                            <Stop offset="0" stopColor="#5A0099" />
                                            <Stop offset="0.5" stopColor="#3D0060" />
                                            <Stop offset="1" stopColor="#2D0057" />
                                        </SvgLinearGradient>

                                        <SvgLinearGradient id="giftRingGrad" x1="0" y1="0" x2="1" y2="1">
                                            <Stop offset="0" stopColor="#FFD700" />
                                            <Stop offset="1" stopColor="#FF8C00" />
                                        </SvgLinearGradient>
                                    </Defs>

                                    {/* Masked group containing our entire cover design */}
                                    <G mask="url(#scratchMask)">
                                        {/* Background gradient */}
                                        <Rect x="0" y="0" width="100%" height="100%" fill="url(#coverGrad)" />

                                        {/* Gloss bands mimicking metallic sheen */}
                                        <Rect x="0" y="30%" width="100%" height="6%" fill="rgba(255,255,255,0.07)" />
                                        <Rect x="0" y="38%" width="100%" height="2%" fill="rgba(255,255,255,0.04)" />

                                        {/* Decorative Dots */}
                                        {DECOR_DOTS.map((dot, i) => (
                                            <Circle
                                                key={`dot-${i}`}
                                                cx={dot.x * CARD_WIDTH}
                                                cy={dot.y * CARD_HEIGHT}
                                                r={dot.r}
                                                fill="rgba(255,215,0,0.9)"
                                                opacity={dot.o}
                                            />
                                        ))}

                                        {/* Center Gift Ring & Icon */}
                                        <Circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r={46} fill="url(#giftRingGrad)" />
                                        <Circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r={46} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />

                                        <G transform={`translate(${CARD_WIDTH / 2 - 24}, ${CARD_HEIGHT / 2 - 24}) scale(2)`}>
                                            <Path d={GIFT_PATH} fill="#2D0057" />
                                        </G>
                                    </G>
                                </Svg>

                                {/* ── Shine Sweep Effect ── */}
                                <Animated.View
                                    style={[styles.shine, { opacity: shineOpacity, transform: [{ translateX: shineAnim }] }]}
                                    pointerEvents="none"
                                />


                                {/* ── Progress Dots ── */}
                                {scratchProgress > 0.02 && (
                                    <View style={styles.progressRow} pointerEvents="none">
                                        {Array(5).fill(0).map((_, i) => (
                                            <View
                                                key={i}
                                                style={[
                                                    styles.progressDot,
                                                    { backgroundColor: scratchProgress > (i + 1) / 5 ? BRAND.yellow : 'rgba(255,255,255,0.3)' }
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </Animated.View>
                        )}
                    </View>

                    {/* ── CTA Button ── */}
                    <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.ctaWrapper}>
                        <LinearGradient
                            colors={revealed ? [BRAND.orange, '#FF6B00'] : ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0.10)']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.ctaButton}
                        >
                            <Text style={[styles.ctaText, !revealed && { color: 'rgba(255,255,255,0.8)' }]}>
                                {revealed ? (coupon ? '🎁  Claim Reward' : 'Got it') : 'Close'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.brandNote}>HashView • Rewards</Text>
                </Animated.View>
            </LinearGradient>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { width: width * 0.95, alignItems: 'center' },

    headerBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,140,0,0.18)',
        borderWidth: 1, borderColor: 'rgba(255,140,0,0.45)', borderRadius: 50,
        paddingHorizontal: 18, paddingVertical: 6, marginBottom: 10,
    },
    headerEmoji: { fontSize: 16 },
    headerLabel: {
        fontSize: 13, fontWeight: '800', color: BRAND.orangeLight,
        letterSpacing: 1.5, marginHorizontal: 8,
    },
    subtitle: {
        fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 18, letterSpacing: 0.3,
    },

    cardWrapper: {
        width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 24, overflow: 'hidden',
        elevation: 24, shadowColor: BRAND.magenta, shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.55, shadowRadius: 20, borderWidth: 2, borderColor: 'rgba(187,68,204,0.7)',
    },

    rewardLayer: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', padding: 24,
    },
    decorTopLeft: {
        position: 'absolute', top: -30, left: -30, width: 100, height: 100,
        borderRadius: 50, backgroundColor: 'rgba(187,68,204,0.15)',
    },
    decorBottomRight: {
        position: 'absolute', bottom: -40, right: -40, width: 130, height: 130,
        borderRadius: 65, backgroundColor: 'rgba(255,140,0,0.1)',
    },
    rewardContent: { alignItems: 'center', width: '100%' },
    iconRing: {
        width: 76, height: 76, borderRadius: 38, justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    iconInner: {
        width: 64, height: 64, borderRadius: 32, backgroundColor: '#FFF8F0', justifyContent: 'center', alignItems: 'center',
    },
    rewardValue: {
        fontSize: 42, fontWeight: '900', color: BRAND.purple, marginBottom: 6,
        letterSpacing: -1, textShadowColor: 'rgba(187,68,204,0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
    },
    rewardDesc: {
        fontSize: 13, color: '#555', textAlign: 'center', marginBottom: 18, lineHeight: 18, paddingHorizontal: 10,
    },
    codeBox: {
        backgroundColor: BRAND.purple, paddingVertical: 10, paddingHorizontal: 22, borderRadius: 14, alignItems: 'center',
        marginBottom: 12, width: '100%', shadowColor: BRAND.purple, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
    },
    codeLabel: {
        fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 2, marginBottom: 2, fontWeight: '700',
    },
    codeText: {
        fontSize: 22, fontWeight: 'bold', color: BRAND.orangeLight, letterSpacing: 3,
    },
    nearbyBadge: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,140,0,0.12)',
        borderWidth: 1, borderColor: 'rgba(255,140,0,0.35)', borderRadius: 20, paddingHorizontal: 12,
        paddingVertical: 4, marginBottom: 10, maxWidth: '100%',
    },
    nearbyBadgeText: { fontSize: 12, fontWeight: '700', color: BRAND.orange, marginLeft: 5, flexShrink: 1 },
    validityRow: { flexDirection: 'row', alignItems: 'center' },
    expiryText: { fontSize: 11, color: '#888', fontStyle: 'italic' },
    detailsBox: {
        marginTop: 10, backgroundColor: 'rgba(255,140,0,0.05)', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 12, width: '100%', alignItems: 'flex-start',
    },
    detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    detailText: { fontSize: 11, color: '#666', flexShrink: 1 },

    // Scratch Cover Container
    scratchLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },

    // Shine sweep - separate view positioned identically
    shine: {
        ...StyleSheet.absoluteFillObject,
        width: 80, backgroundColor: 'rgba(255,255,255,0.18)', transform: [{ skewX: '-20deg' }],
    },

    scratchHint: {
        ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center',
    },
    scratchHintInner: {
        alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.42)', paddingHorizontal: 32, paddingVertical: 22,
        borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
    },
    fingerEmoji: { fontSize: 36, marginBottom: 6 },
    scratchText: {
        fontSize: 22, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5,
        textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
    },
    arrowText: { fontSize: 13, color: 'rgba(255,215,0,0.85)', letterSpacing: 1, marginTop: 6 },

    progressRow: {
        position: 'absolute', bottom: 12, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center',
        alignItems: 'center', gap: 6,
    },
    progressDot: { width: 8, height: 8, borderRadius: 4 },

    ctaWrapper: { marginTop: 22, width: CARD_WIDTH, borderRadius: 50, overflow: 'hidden' },
    ctaButton: {
        paddingVertical: 15, alignItems: 'center', borderRadius: 50, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    },
    ctaText: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    brandNote: { marginTop: 14, fontSize: 11, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, fontWeight: '600' },
});

export default ScratchCardModal;
