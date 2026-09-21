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
  const mouth = useSharedValue(0.3);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2200, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );

    const blinkLoop = () => {
      blink.value = withSequence(
        withTiming(1, { duration: 2800 }),
        withTiming(0.08, { duration: 90 }),
        withTiming(1, { duration: 120 }),
      );
    };
    blinkLoop();
    const blinkInterval = setInterval(blinkLoop, 3200);
    return () => clearInterval(blinkInterval);
  }, [breathe, blink]);

  useEffect(() => {
    pulse.value = withTiming(
      state === 'user_speaking' ? Math.min(1, amplitude * 1.4) : 0,
      { duration: 120 },
    );
  }, [amplitude, pulse, state]);

  useEffect(() => {
    if (state === 'thinking') {
      shimmer.value = withRepeat(withTiming(1, { duration: 1400 }), -1, true);
    } else {
      shimmer.value = withTiming(0, { duration: 300 });
    }
  }, [shimmer, state]);

  useEffect(() => {
    if (state === 'speaking') {
      mouth.value = withRepeat(
        withSequence(
          withTiming(0.85, { duration: 180 }),
          withTiming(0.25, { duration: 160 }),
        ),
        -1,
        true,
      );
    } else {
      mouth.value = withTiming(0.3, { duration: 200 });
    }
  }, [mouth, state]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(breathe.value, [0, 1], [1, 1.04]) },
      { scale: 1 + pulse.value * 0.06 },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.35]),
    transform: [{ rotate: `${interpolate(shimmer.value, [0, 1], [0, 12])}deg` }],
  }));

  const leftEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  const rightEyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: blink.value }],
  }));

  const mouthStyle = useAnimatedStyle(() => ({
    height: interpolate(mouth.value, [0, 1], [8, 28]),
    borderRadius: interpolate(mouth.value, [0, 1], [8, 14]),
  }));

  const rippleStyle = useAnimatedStyle(() => ({
    opacity: pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.35 }],
  }));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Animated.View style={[styles.ripple, rippleStyle, { width: size * 1.1, height: size * 1.1 }]} />
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 8,
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
    width: 32,
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
