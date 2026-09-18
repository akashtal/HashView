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
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, {
  Defs,
  Mask,
  Rect,
  Path,
  G,
  LinearGradient as SvgLinearGradient,
  Stop,
  Circle,
} from 'react-native-svg';

const { width } = Dimensions.get('window');

// ─── Brand Colors ──────────────────────────────────────────────────────────
const BRAND = {
  purple: '#2D0057',
  deepPurple: '#1A0033',
  orange: '#FF8C00',
  orangeLight: '#FFA940',
  magenta: '#BB44CC',
  yellow: '#FFD700',
  white: '#FFFFFF',
};

// ─── Card dimensions ────────────────────────────────────────────────────────
const CARD_WIDTH = width * 0.88;
const CARD_HEIGHT = CARD_WIDTH * 1.15; // Proportional height

// ─── Scratch configuration ──────────────────────────────────────────────────
const REVEAL_THRESHOLD = 0.4;
const STROKE_WIDTH = 45;

const LOGIC_COLS = 15;
const LOGIC_ROWS = 15;
const LOGIC_TOTAL = LOGIC_COLS * LOGIC_ROWS;
const LOGIC_CELL_W = CARD_WIDTH / LOGIC_COLS;
const LOGIC_CELL_H = CARD_HEIGHT / LOGIC_ROWS;

const DECOR_DOTS = [
  { x: 0.1, y: 0.15, r: 4, o: 0.8 },
  { x: 0.85, y: 0.12, r: 6, o: 0.6 },
  { x: 0.9, y: 0.8, r: 3, o: 0.9 },
  { x: 0.15, y: 0.85, r: 7, o: 0.5 },
  { x: 0.5, y: 0.08, r: 3, o: 0.7 },
  { x: 0.2, y: 0.5, r: 5, o: 0.4 },
  { x: 0.8, y: 0.45, r: 4, o: 0.8 },
  { x: 0.5, y: 0.9, r: 5, o: 0.6 },
];

const TICKET_PATH =
  'M22 6h-4.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.07 0-2.06.5-2.65 1.25C11.89 2.5 10.9 2 9.83 2 8.17 2 6.83 3.34 6.83 5c0 .35.07.69.18 1H3c-1.11 0-2 .89-2 2v3c0 1.11.89 2 2 2v9c0 1.11.89 2 2 2h14c1.11 0 2-.89 2-2v-9c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-7 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-6 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zM3 8h7v3H3V8zm2 13v-9h5v9H5zm14 0h-5v-9h5v9zm0-11h-7V8h7v3z';

const AwarenessScratchCardModal = ({ visible, onClose }) => {
  const [revealed, setRevealed] = useState(false);
  const [scratchProgress, setScratchProgress] = useState(0);
  const [pathData, setPathData] = useState('');

  const pathRef = useRef('');
  const scratchedLogicCells = useRef(new Set());
  const revealedRef = useRef(false);
  const hintHidden = useRef(false);
  const lastUpdate = useRef(0);

  // Animations
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const revealScale = useRef(new Animated.Value(0.7)).current;
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
        Animated.timing(shineAnim, {
          toValue: CARD_WIDTH * 2,
          duration: 900,
          useNativeDriver: true,
        }).start(() => {
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
    revealedRef.current = false;
    setScratchProgress(0);
    setPathData('');
    pathRef.current = '';
    scratchedLogicCells.current.clear();
    hintHidden.current = false;

    cardScale.setValue(0.3);
    cardOpacity.setValue(0);
    contentOpacity.setValue(0.3);
    revealScale.setValue(0.7);
    coverOpacity.setValue(1);
    shineAnim.setValue(-CARD_WIDTH);
    shineOpacity.setValue(1);
    hintOpacity.setValue(1);
    hintPulse.setValue(1);
  };

  const runRevealAnimation = () => {
    revealedRef.current = true;
    Vibration.vibrate(50);
    
    Animated.parallel([
      Animated.timing(coverOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(revealScale, { toValue: 1, friction: 5, tension: 40, useNativeDriver: true }),
    ]).start(() => {
      setRevealed(true);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderGrant: (evt) => {
        if (revealedRef.current) return;
        const { localX, localY } = getLocalCoords(evt);
        pathRef.current += ` M ${localX} ${localY} L ${localX} ${localY}`;
        setPathData(pathRef.current);
        updateLogicBox(localX, localY);
        hideHints();
      },
      onPanResponderMove: (evt) => {
        if (revealedRef.current) return;
        const { localX, localY } = getLocalCoords(evt);
        pathRef.current += ` L ${localX} ${localY}`;

        const now = Date.now();
        if (now - lastUpdate.current > 16) {
          setPathData(pathRef.current);
          lastUpdate.current = now;
        }
        updateLogicBox(localX, localY);
      },
      onPanResponderRelease: () => {
        if (!revealedRef.current) setPathData(pathRef.current);
      },
    })
  ).current;

  const getLocalCoords = (evt) => {
    return {
      localX: evt.nativeEvent.locationX,
      localY: evt.nativeEvent.locationY,
    };
  };

  const updateLogicBox = (x, y) => {
    const col = Math.floor(x / LOGIC_CELL_W);
    const row = Math.floor(y / LOGIC_CELL_H);

    let newScratch = false;
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

  return (
    <Modal visible={visible} animationType="fade" transparent={true} onRequestClose={onClose}>
      <LinearGradient colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.7)']} style={styles.overlay}>
        
        {/* Header Titles */}
        <View style={styles.header}>
          <Text style={styles.title}>SURPRISE!</Text>
          <Text style={styles.subtitle}>Scratch to discover a new feature</Text>
        </View>

        <Animated.View style={[styles.cardWrapper, { transform: [{ scale: cardScale }], opacity: cardOpacity }]}>
          <View style={styles.cardContainer}>
            
            {/* ── UNDERLYING REVEALED CONTENT ── */}
            <Animated.View
              style={[styles.rewardLayer, { opacity: contentOpacity, transform: [{ scale: revealScale }] }]}
            >
              <View style={styles.iconRing}>
                <Ionicons name="ticket" size={48} color="#F59E0B" />
                <View style={styles.currencyBadge}>
                  <Text style={styles.currencyText}>£</Text>
                </View>
              </View>

              <Text style={styles.rewardTitle}>Did you know?</Text>
              
              <Text style={styles.rewardDesc}>
                You win a scratch card on every review
              </Text>

              <View style={styles.flowRow}>
                <Ionicons name="star" size={20} color="#F4B400" />
                <Ionicons name="arrow-forward" size={14} color="#9CA3AF" style={{marginHorizontal: 8}} />
                <Ionicons name="ticket" size={20} color="#F59E0B" />
                <Ionicons name="arrow-forward" size={14} color="#9CA3AF" style={{marginHorizontal: 8}} />
                <Ionicons name="cash" size={20} color="#10B981" />
              </View>
            </Animated.View>

            {/* ── SCRATCH COVER (SVG MASK) ── */}
            {!revealed && (
              <Animated.View style={[styles.scratchLayer, { opacity: coverOpacity }]}>
                <Svg width={CARD_WIDTH} height={CARD_HEIGHT}>
                  <Defs>
                    <Mask id="scratchMask">
                      <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} fill="white" />
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
                      <Stop offset="0" stopColor="#F59E0B" />
                      <Stop offset="0.5" stopColor="#D97706" />
                      <Stop offset="1" stopColor="#B45309" />
                    </SvgLinearGradient>

                    <SvgLinearGradient id="iconRingGrad" x1="0" y1="0" x2="1" y2="1">
                      <Stop offset="0" stopColor="#FFD700" />
                      <Stop offset="1" stopColor="#FFF" />
                    </SvgLinearGradient>
                  </Defs>

                  <G mask="url(#scratchMask)">
                    <Rect x="0" y="0" width={CARD_WIDTH} height={CARD_HEIGHT} fill="url(#coverGrad)" />
                    
                    {/* Gloss bands */}
                    <Rect x="0" y={CARD_HEIGHT * 0.3} width={CARD_WIDTH} height={CARD_HEIGHT * 0.06} fill="rgba(255,255,255,0.15)" />
                    <Rect x="0" y={CARD_HEIGHT * 0.38} width={CARD_WIDTH} height={CARD_HEIGHT * 0.02} fill="rgba(255,255,255,0.08)" />

                    {/* Dots */}
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

                    <Circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r={46} fill="url(#iconRingGrad)" />
                    <Circle cx={CARD_WIDTH / 2} cy={CARD_HEIGHT / 2} r={46} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
                    <G transform={`translate(${CARD_WIDTH / 2 - 24}, ${CARD_HEIGHT / 2 - 24}) scale(2)`}>
                      <Path d={TICKET_PATH} fill="#D97706" />
                    </G>
                  </G>
                </Svg>

                <Animated.View style={[styles.shine, { opacity: shineOpacity, transform: [{ translateX: shineAnim }] }]} pointerEvents="none" />

                <Animated.View style={[styles.scratchHint, { opacity: hintOpacity, transform: [{ scale: hintPulse }] }]} pointerEvents="none">
                  <View style={styles.scratchHintInner}>
                    <Text style={styles.fingerEmoji}>👆</Text>
                    <Text style={styles.scratchText}>SCRATCH</Text>
                  </View>
                </Animated.View>

                {scratchProgress > 0.02 && (
                  <View style={styles.progressRow} pointerEvents="none">
                    {Array(5).fill(0).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.progressDot,
                          { backgroundColor: scratchProgress > (i + 1) / 5 ? '#FFF' : 'rgba(255,255,255,0.3)' },
                        ]}
                      />
                    ))}
                  </View>
                )}

                {/* Touch Catcher Overlay (Fixes real device locationX/Y bugs) */}
                <View 
                  style={{ position: 'absolute', top: 0, left: 0, width: CARD_WIDTH, height: CARD_HEIGHT }} 
                  {...panResponder.panHandlers} 
                />
              </Animated.View>
            )}
          </View>
          
          {revealed && (
            <ConfettiCannon
              count={200}
              origin={{x: -10, y: 0}}
              fallSpeed={3000}
              explosionSpeed={350}
              fadeOut={true}
            />
          )}

          {/* CTA */}
          <TouchableOpacity onPress={onClose} activeOpacity={0.85} style={styles.ctaWrapper}>
            <LinearGradient
              colors={revealed ? ['#10B981', '#059669'] : ['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
              style={styles.ctaButton}
            >
              <Text style={[styles.ctaText, !revealed && { color: 'rgba(255,255,255,0.5)' }]}>
                {revealed ? 'Awesome, got it!' : 'Close'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '900', color: '#FFF', letterSpacing: 2, marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  
  cardWrapper: { alignItems: 'center' },
  cardContainer: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    elevation: 20,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
  },

  rewardLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF',
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFBEB',
    borderWidth: 3,
    borderColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  currencyBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: '#10B981',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  rewardTitle: { fontSize: 22, fontWeight: '900', color: '#111', marginBottom: 12 },
  rewardDesc: { fontSize: 14, color: '#444', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },

  scratchLayer: { 
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: 'transparent'
  },
  shine: {
    ...StyleSheet.absoluteFillObject,
    width: 80,
    backgroundColor: 'rgba(255,255,255,0.2)',
    transform: [{ skewX: '-20deg' }],
  },
  scratchHint: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  scratchHintInner: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 30,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  fingerEmoji: { fontSize: 32, marginBottom: 4 },
  scratchText: { fontSize: 18, fontWeight: '800', color: '#FFF', letterSpacing: 1 },
  
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
  progressDot: { width: 8, height: 8, borderRadius: 4 },

  ctaWrapper: { marginTop: 20, width: CARD_WIDTH },
  ctaButton: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 16,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
});

export default AwarenessScratchCardModal;
