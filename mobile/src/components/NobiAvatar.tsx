import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import type { VoiceSessionState } from '../types';

interface NobiAvatarProps {
  state: VoiceSessionState;
  amplitude?: number;
  size?: number;
}

export function NobiAvatar({ state, amplitude = 0, size = 220 }: NobiAvatarProps) {
  const breathe = useSharedValue(0);
  const blink = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const pulse = useSharedValue(0);
  const mouthOpen = useSharedValue(0.3);
  const mouthWidth = useSharedValue(32);
  const glow = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const blinkLoop = () => {
      blink.value = withSequence(
        withTiming(1, { duration: 3000 }),
        withTiming(0.06, { duration: 80 }),
        withTiming(1, { duration: 100 }),
      );
    };
    blinkLoop();
    const blinkInterval = setInterval(blinkLoop, 3400);
    return () => clearInterval(blinkInterval);
  }, [breathe, blink]);

  useEffect(() => {
    const target =
      state === 'user_speaking'
        ? Math.min(1, amplitude * 1.5)
        : state === 'speaking'
          ? Math.min(1, amplitude * 1.2)
          : 0;
    pulse.value = withTiming(target, { duration: 100 });
    glow.value = withTiming(target * 0.7, { duration: 120 });
  }, [amplitude, glow, pulse, state]);

  useEffect(() => {
    if (state === 'thinking') {
      shimmer.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
    } else {
      shimmer.value = withTiming(0, { duration: 300 });
    }
  }, [shimmer, state]);

  useEffect(() => {
    if (state === 'speaking') {
      const open = 0.25 + amplitude * 0.65;
      mouthOpen.value = withTiming(open, { duration: 90 });
      mouthWidth.value = withTiming(28 + amplitude * 18, { duration: 90 });
    } else {
      mouthOpen.value = withTiming(0.3, { duration: 200 });
      mouthWidth.value = withTiming(32, { duration: 200 });
    }
  }, [amplitude, mouthOpen, mouthWidth, state]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(breathe.value, [0, 1], [1, 1.03]) },
      { scale: 1 + pulse.value * 0.05 },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.3]),
    transform: [{ rotate: `${interpolate(shimmer.value, [0, 1], [0, 10])}deg` }],
  }));

  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  const mouthStyle = useAnimatedStyle(() => ({
    height: interpolate(mouthOpen.value, [0, 1], [8, 32]),
    width: mouthWidth.value,
    borderRadius: interpolate(mouthOpen.value, [0, 1], [8, 16]),
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.5,
    transform: [{ scale: 1 + pulse.value * 0.4 }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.35,
    transform: [{ scale: 1.15 + glow.value * 0.2 }],
  }));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Animated.View
        style={[styles.glow, glowStyle, { width: size * 1.25, height: size * 1.25 }]}
      />
      <Animated.View style={[styles.ripple, rippleStyle, { width: size * 1.12, height: size * 1.12 }]} />
      <Animated.View style={[styles.body, bodyStyle, { width: size * 0.82, height: size * 0.78 }]}>
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
        <View style={styles.face}>
          <View style={styles.eyes}>
            <Animated.View style={[styles.eye, leftEyeStyle]} />
            <Animated.View style={[styles.eye, rightEyeStyle]} />
          </View>
          <Animated.View style={[styles.mouth, mouthStyle]} />
          <View style={[styles.cheek, styles.cheekLeft]} />
          <View style={[styles.cheek, styles.cheekRight]} />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  ripple: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
  },
  body: {
    borderRadius: 999,
    backgroundColor: colors.blobBody,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 4,
    overflow: 'hidden',
  },
  shimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.blobHighlight,
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  eyes: {
    flexDirection: 'row',
    gap: 36,
    marginBottom: 18,
  },
  eye: {
    width: 18,
    height: 22,
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  mouth: {
    backgroundColor: colors.text,
  },
  cheek: {
    position: 'absolute',
    width: 22,
    height: 14,
    borderRadius: 10,
    backgroundColor: colors.blobCheek,
    opacity: 0.7,
    top: 52,
  },
  cheekLeft: { left: 28 },
  cheekRight: { right: 28 },
});
