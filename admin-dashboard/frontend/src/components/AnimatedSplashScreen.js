import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { COLORS } from '../config/colors';
import * as SplashScreen from 'expo-splash-screen';

const { width, height } = Dimensions.get('window');

// Keep splash screen visible while we prepare the app
SplashScreen.preventAutoHideAsync().catch(console.warn);

export default function AnimatedSplashScreen({ onAnimationComplete, isReady }) {
  const logoScale = useSharedValue(0);
  const logoRotation = useSharedValue(0);
  const circleScale = useSharedValue(0);
  const opacity = useSharedValue(1);
  const star1Rotation = useSharedValue(0);
  const star2Rotation = useSharedValue(0);
  const star3Rotation = useSharedValue(0);
  const star4Rotation = useSharedValue(0);

  useEffect(() => {
    // Start animations
    circleScale.value = withTiming(1, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });

    logoScale.value = withSequence(
      withTiming(0.8, { duration: 400, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.5)) })
    );

    logoRotation.value = withSequence(
      withTiming(-10, { duration: 300 }),
      withTiming(10, { duration: 300 }),
      withTiming(0, { duration: 300 })
    );

    // Continuous star rotations
    star1Rotation.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    star2Rotation.value = withRepeat(
      withTiming(-360, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
    star3Rotation.value = withRepeat(
      withTiming(360, { duration: 3500, easing: Easing.linear }),
      -1,
      false
    );
    star4Rotation.value = withRepeat(
      withTiming(-360, { duration: 2800, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  // Handle splash completion once ready
  useEffect(() => {
    if (isReady) {
      // Fade out and complete
      const timer = setTimeout(() => {
        opacity.value = withTiming(0, {
          duration: 500,
          easing: Easing.ease,
        });
        setTimeout(() => {
          SplashScreen.hideAsync().catch(console.warn);
          if (onAnimationComplete) {
            onAnimationComplete();
          }
        }, 500);
      }, 1000); // Give a bit of time for the entry animation to feel natural
      return () => clearTimeout(timer);
    }
  }, [isReady]);

  const circleAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: circleScale.value }],
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value },
      { rotate: `${logoRotation.value}deg` },
    ],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const star1Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${star1Rotation.value}deg` }],
  }));

  const star2Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${star2Rotation.value}deg` }],
  }));

  const star3Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${star3Rotation.value}deg` }],
  }));

  const star4Style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${star4Rotation.value}deg` }],
  }));

  // Star component
  const Star = ({ style, size = 20, color = COLORS.secondary }) => (
    <Animated.View style={[styles.starContainer, style]}>
      <View
        style={[
          styles.star,
          {
            width: size,
            height: size,
            borderColor: COLORS.white,
            backgroundColor: color,
          },
        ]}
      />
    </Animated.View>
  );

  // Circle component
  const Circle = ({ style, size = 12, color = COLORS.primary }) => (
    <Animated.View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          backgroundColor: color,
          borderColor: COLORS.white,
        },
        style,
      ]}
    />
  );

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      <View style={styles.background} />

      {/* White Circle */}
      <Animated.View style={[styles.whiteCircle, circleAnimatedStyle]}>
        {/* Hashtag Logo */}
        <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
          <View style={styles.hashtag}>
            {/* Vertical bars */}
            <View style={[styles.bar, styles.barVertical, styles.barLeft]} />
            <View style={[styles.bar, styles.barVertical, styles.barRight]} />
            {/* Horizontal bars */}
            <View style={[styles.bar, styles.barHorizontal, styles.barTop]} />
            <View style={[styles.bar, styles.barHorizontal, styles.barBottom]} />

            {/* Inner pattern lines */}
            <View style={styles.patternContainer}>
              <View style={[styles.patternLine, { top: 10, left: 15, transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.patternLine, { top: 20, left: 25, transform: [{ rotate: '-45deg' }] }]} />
              <View style={[styles.patternLine, { top: 30, left: 15, transform: [{ rotate: '45deg' }] }]} />
              <View style={[styles.patternLine, { top: 40, left: 25, transform: [{ rotate: '-45deg' }] }]} />
            </View>
          </View>
        </Animated.View>

        {/* Decorative Elements */}
        <Star style={[star1Style, { top: 40, right: 60 }]} size={16} />
        <Star style={[star2Style, { bottom: 80, left: 50 }]} size={14} />
        <Star style={[star3Style, { top: 120, left: 40 }]} size={18} />
        <Star style={[star4Style, { bottom: 50, right: 70 }]} size={12} />

        <Circle style={{ top: 50, left: 60 }} size={10} />
        <Circle style={{ bottom: 100, left: 70 }} size={8} />
        <Circle style={{ bottom: 60, right: 50 }} size={12} />

        {/* Orange curved lines */}
        <View style={[styles.swoosh, { top: 30, right: 40, transform: [{ rotate: '45deg' }] }]} />
        <View style={[styles.swoosh, { bottom: 90, left: 45, transform: [{ rotate: '-45deg' }] }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.primary, // Dark purple
  },
  whiteCircle: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: (width * 0.7) / 2,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  hashtag: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  bar: {
    backgroundColor: COLORS.primary,
    position: 'absolute',
  },
  barVertical: {
    width: 20,
    height: 100,
    borderRadius: 10,
  },
  barLeft: {
    left: 30,
    top: 10,
  },
  barRight: {
    right: 30,
    top: 10,
  },
  barHorizontal: {
    width: 100,
    height: 20,
    borderRadius: 10,
  },
  barTop: {
    top: 40,
    left: 10,
  },
  barBottom: {
    bottom: 40,
    left: 10,
  },
  patternContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  patternLine: {
    position: 'absolute',
    width: 2,
    height: 30,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.6,
  },
  starContainer: {
    position: 'absolute',
  },
  star: {
    borderWidth: 1.5,
    borderRadius: 2,
    transform: [{ rotate: '45deg' }],
  },
  circle: {
    position: 'absolute',
    borderRadius: 50,
    borderWidth: 1.5,
  },
  swoosh: {
    position: 'absolute',
    width: 20,
    height: 3,
    backgroundColor: COLORS.secondary,
    borderRadius: 2,
  },
});

