import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import type { VoiceSessionState } from '../types';

interface NobiAvatarProps {
  state: VoiceSessionState;
  amplitude?: number;
  size?: number;
  /** Softer / fewer aura rings (session view) */
  softAura?: boolean;
}

/**
 * Soft companion avatar — organic mic aura / sound rings when speaking,
 * scale + tilt driven by audio state (no harsh purple pulse).
 */
export function NobiAvatar({ state, amplitude = 0, size = 220, softAura = false }: NobiAvatarProps) {
  const breathe = useSharedValue(0);
  const blink = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const scaleBoost = useSharedValue(0);
  const tilt = useSharedValue(0);
  const mouthOpen = useSharedValue(0.3);
  const mouthWidth = useSharedValue(32);
  const ringA = useSharedValue(0);
  const ringB = useSharedValue(0);
  const ringC = useSharedValue(0);

  useEffect(() => {
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
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
    const speaking =
      state === 'speaking' || state === 'user_speaking' || state === 'listening';
    const level = speaking ? Math.min(1, amplitude) : 0;

    scaleBoost.value = withSpring(level * (state === 'speaking' ? 0.06 : 0.04), {
      damping: 14,
      stiffness: 180,
    });
    tilt.value = withSpring(
      state === 'thinking' ? -3 : state === 'speaking' ? level * 2.5 : level * -1.5,
      { damping: 12, stiffness: 120 },
    );

    const ringScale = softAura ? 0.35 : 1;
    if (state === 'speaking' || state === 'user_speaking') {
      ringA.value = withTiming((0.25 + level * 0.2) * ringScale, { duration: 120 });
      ringB.value = withTiming((0.15 + level * 0.15) * ringScale, { duration: 160 });
      ringC.value = withTiming(0, { duration: 200 });
    } else if (state === 'listening' && !softAura) {
      ringA.value = withRepeat(
        withSequence(
          withTiming(0.18, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
      ringB.value = withTiming(0, { duration: 300 });
      ringC.value = withTiming(0, { duration: 300 });
    } else {
      ringA.value = withTiming(0, { duration: 280 });
      ringB.value = withTiming(0, { duration: 280 });
      ringC.value = withTiming(0, { duration: 280 });
    }
  }, [amplitude, ringA, ringB, ringC, scaleBoost, softAura, state, tilt]);

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
    } else if (state === 'listening' || state === 'user_speaking') {
      mouthOpen.value = withTiming(0.35, { duration: 180 });
      mouthWidth.value = withTiming(34, { duration: 180 });
    } else {
      mouthOpen.value = withTiming(0.28, { duration: 200 });
      mouthWidth.value = withTiming(32, { duration: 200 });
    }
  }, [amplitude, mouthOpen, mouthWidth, state]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(breathe.value, [0, 1], [1, 1.025]) + scaleBoost.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.28]),
    transform: [{ rotate: `${interpolate(shimmer.value, [0, 1], [0, 8])}deg` }],
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

  const ringAStyle = useAnimatedStyle(() => ({
    opacity: ringA.value * (softAura ? 0.25 : 0.45),
    transform: [{ scale: 1.02 + ringA.value * 0.08 }],
  }));
  const ringBStyle = useAnimatedStyle(() => ({
    opacity: ringB.value * 0.35,
    transform: [{ scale: 1.08 + ringB.value * 0.1 }],
  }));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {!softAura && (
        <Animated.View
          style={[
            styles.auraRing,
            ringBStyle,
            { width: size * 0.98, height: size * 0.98, borderColor: colors.primarySoft },
          ]}
        />
      )}
      <Animated.View
        style={[
          styles.auraFill,
          ringAStyle,
          {
            width: size * 0.92,
            height: size * 0.92,
            backgroundColor: softAura ? 'transparent' : colors.micAura,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.body,
          bodyStyle,
          {
            width: size * 0.88,
            height: size * 0.88,
            borderRadius: size * 0.44,
          },
        ]}
      >
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
  auraRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  auraFill: {
    position: 'absolute',
    borderRadius: 999,
  },
  body: {
    borderRadius: 999,
    backgroundColor: colors.blobBody,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
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
    width: '100%',
    height: '100%',
    paddingTop: 4,
  },
  eyes: {
    flexDirection: 'row',
    gap: 28,
    marginBottom: 14,
    marginTop: 6,
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
  cheekLeft: { left: '22%' },
  cheekRight: { right: '22%' },
});
