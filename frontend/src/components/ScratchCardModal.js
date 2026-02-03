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
    Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../config/colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width * 0.85;
const CARD_HEIGHT = CARD_WIDTH * 1.2; // Adjust aspect ratio

// Grid configuration for scratch effect
const ROWS = 10;
const COLS = 10;
const TOTAL_CELLS = ROWS * COLS;
const CELL_WIDTH = CARD_WIDTH / COLS;
const CELL_HEIGHT = CARD_HEIGHT / ROWS;
const REVEAL_THRESHOLD = 0.45; // 45% scratched reveals all

const ScratchCardModal = ({ visible, onClose, coupon }) => {
    const [revealed, setRevealed] = useState(false);
    const [scratchedCount, setScratchedCount] = useState(0);

    // Create animated values for each cell opacity
    const cellOpacities = useRef(
        Array(TOTAL_CELLS).fill(0).map(() => new Animated.Value(1))
    ).current;

    // Track which cells are already scratched to avoid double counting
    const scratchedCells = useRef(new Set()).current;

    // Animation for the final reveal (card pop/shake)
    const cardScale = useRef(new Animated.Value(0.8)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Reset state when modal opens
            resetCard();
            Animated.parallel([
                Animated.spring(cardScale, {
                    toValue: 1,
                    friction: 8,
                    useNativeDriver: true
                }),
                Animated.timing(cardOpacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                })
            ]).start();
        }
    }, [visible]);

    useEffect(() => {
        // Check if threshold reached
        if (!revealed && scratchedCount / TOTAL_CELLS > REVEAL_THRESHOLD) {
            revealAll();
        }
    }, [scratchedCount]);

    const resetCard = () => {
        setRevealed(false);
        setScratchedCount(0);
        scratchedCells.clear();
        cellOpacities.forEach(anim => anim.setValue(1));
    };

    const revealAll = () => {
        setRevealed(true);
        Vibration.vibrate(50); // Haptic feedback

        // Fade out remaining cells
        Animated.stagger(10,
            cellOpacities.map(anim =>
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true
                })
            )
        ).start();
    };

    // PanResponder to handle scratching
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => { },
            onPanResponderMove: (evt, gestureState) => {
                if (revealed) return;

                // Calculate touch position relative to the grid
                // Note: Simple approximation. For better precision, we'd need onLayout to get exact card coordinates.
                // Assuming Card is centered.
                const touchX = gestureState.moveX - (width - CARD_WIDTH) / 2;
                const touchY = gestureState.moveY - (Dimensions.get('window').height - CARD_HEIGHT) / 2;

                handleScratch(touchX, touchY);
            },
        })
    ).current;

    const handleScratch = (x, y) => {
        // Map coordinates to grid index
        const col = Math.floor(x / CELL_WIDTH);
        const row = Math.floor(y / CELL_HEIGHT);

        if (col >= 0 && col < COLS && row >= 0 && row < ROWS) {
            const index = row * COLS + col;

            if (!scratchedCells.has(index)) {
                scratchedCells.add(index);
                setScratchedCount(prev => prev + 1);

                Animated.timing(cellOpacities[index], {
                    toValue: 0,
                    duration: 150, // Fast fade for instant feel
                    useNativeDriver: true
                }).start();
            }
        }
    };

    if (!visible || !coupon) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <Animated.View
                    style={[
                        styles.container,
                        { opacity: cardOpacity, transform: [{ scale: cardScale }] }
                    ]}
                >
                    {/* Header */}
                    <Text style={styles.title}>You've earned a reward!</Text>
                    <Text style={styles.subtitle}>Scratch below to reveal</Text>

                    {/* Card Container */}
                    <View style={styles.cardWrapper}>

                        {/* 1. Underlying Reward Content (Back Layer) */}
                        <LinearGradient
                            colors={[COLORS.white, '#f0f9ff']}
                            style={styles.rewardLayer}
                        >
                            <View style={styles.rewardContent}>
                                <View style={styles.iconContainer}>
                                    <Ionicons name="gift-outline" size={48} color={COLORS.primary} />
                                </View>

                                <Text style={styles.rewardValue}>
                                    {coupon.rewardType === 'percentage' ? `${coupon.rewardValue}% OFF` :
                                        coupon.rewardType === 'fixed' ? `₹${coupon.rewardValue} OFF` :
                                            'FREE GIFT'}
                                </Text>

                                <Text style={styles.rewardDesc}>
                                    {coupon.description || 'On your next visit'}
                                </Text>

                                <View style={styles.codeContainer}>
                                    <Text style={styles.codeLabel}>CODE:</Text>
                                    <Text style={styles.codeText}>{coupon.code}</Text>
                                </View>

                                <Text style={styles.expiryText}>
                                    Valid for 2 hours
                                </Text>
                            </View>
                        </LinearGradient>

                        {/* 2. Scratch Overlay (Front Layer) */}
                        <View
                            style={[styles.scratchLayer, revealed && styles.pointerEventsNone]}
                            {...panResponder.panHandlers}
                        >
                            {/* Grid of mask cells */}
                            <View style={styles.gridContainer}>
                                {cellOpacities.map((opacity, index) => (
                                    <Animated.View
                                        key={index}
                                        style={[
                                            styles.cell,
                                            { opacity, width: CELL_WIDTH, height: CELL_HEIGHT }
                                        ]}
                                    >
                                        {/* Render gradient only on initial cells to form the cover */}
                                        <LinearGradient
                                            colors={[COLORS.primary, COLORS.secondary]}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </Animated.View>
                                ))}
                            </View>

                            {/* Text/Logo on top of the scratch layer */}
                            <View style={styles.scratchContent} pointerEvents="none">
                                <Ionicons name="trophy" size={50} color="rgba(255,255,255,0.9)" />
                                <Text style={styles.scratchText}>Scratch Here!</Text>
                            </View>
                        </View>

                    </View>

                    {/* Close Button */}
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>
                            {revealed ? 'Claim Reward' : 'Close'}
                        </Text>
                    </TouchableOpacity>

                </Animated.View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: width * 0.95,
        alignItems: 'center',
        backgroundColor: 'transparent', // Card handles its own bg
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 20,
    },
    cardWrapper: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 16,
        overflow: 'hidden',
        position: 'relative',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        backgroundColor: '#fff',
    },
    // Back Layer (Reward)
    rewardLayer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    rewardContent: {
        alignItems: 'center',
        width: '100%',
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e6f7ff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    rewardValue: {
        fontSize: 36,
        fontWeight: '900',
        color: COLORS.primary,
        marginBottom: 8,
        textAlign: 'center',
    },
    rewardDesc: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    codeContainer: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 10,
        paddingHorizontal: 25,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        borderStyle: 'dashed',
        alignItems: 'center',
        marginBottom: 15,
        width: '100%',
    },
    codeLabel: {
        fontSize: 12,
        color: '#888',
        marginBottom: 2,
        fontWeight: '600',
    },
    codeText: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        letterSpacing: 2,
    },
    expiryText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },

    // Front Layer (Scratch)
    scratchLayer: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'transparent',
    },
    pointerEventsNone: {
        pointerEvents: 'none',
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    cell: {
        // Determine gradient via child
        overflow: 'hidden',
        backgroundColor: COLORS.primary, // Fallback
        borderColor: 'transparent', // Ensure no borders
    },
    scratchContent: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    scratchText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginTop: 10,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },

    // Buttons
    closeButton: {
        marginTop: 30,
        paddingVertical: 12,
        paddingHorizontal: 40,
        backgroundColor: '#fff',
        borderRadius: 25,
    },
    closeButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.primary,
    }
});

export default ScratchCardModal;
