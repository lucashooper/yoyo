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
  /** Idle/home — no pulse rings on the avatar itself */
  softAura?: boolean;
}

/**
 * Nobi companion avatar — proportions locked to a square body so the face
 * is never stretched. Pulse rings live in MascotGlow, not here.
 */
export function NobiAvatar({ state, amplitude = 0, size = 220, softAura = false }: NobiAvatarProps) {
  const breathe = useSharedValue(0);
  const blink = useSharedValue(1);
  const shimmer = useSharedValue(0);
  const scaleBoost = useSharedValue(0);
  const tilt = useSharedValue(0);
  const mouthOpen = useSharedValue(0.3);
  const mouthWidth = useSharedValue(32);

  const bodySize = size * 0.82;
  const eyeW = Math.max(14, size * 0.082);
  const eyeH = Math.max(18, size * 0.1);
  const eyeGap = Math.max(28, size * 0.16);
  const cheekW = Math.max(18, size * 0.1);
  const cheekH = Math.max(12, size * 0.064);
  const cheekTop = bodySize * 0.48;

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
    if (softAura) return;

    const speaking =
      state === 'speaking' || state === 'user_speaking' || state === 'listening';
    const level = speaking ? Math.min(1, amplitude) : 0;

    scaleBoost.value = withSpring(level * (state === 'speaking' ? 0.04 : 0.03), {
      damping: 14,
      stiffness: 180,
    });
    tilt.value = withSpring(
      state === 'thinking' ? -2 : state === 'speaking' ? level * 1.5 : level * -1,
      { damping: 12, stiffness: 120 },
    );
  }, [amplitude, scaleBoost, softAura, state, tilt]);

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
      { scale: interpolate(breathe.value, [0, 1], [1, 1.02]) + scaleBoost.value },
      { rotate: `${tilt.value}deg` },
    ],
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 1], [0, 0.15]),
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

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Animated.View
        style={[
          styles.body,
          bodyStyle,
          {
            width: bodySize,
            height: bodySize,
            borderRadius: bodySize / 2,
          },
        ]}
      >
        <Animated.View style={[styles.shimmer, shimmerStyle]} />
        <View style={styles.face}>
          <View style={[styles.eyes, { gap: eyeGap }]}>
            <Animated.View
              style={[styles.eye, leftEyeStyle, { width: eyeW, height: eyeH, borderRadius: eyeW / 2 }]}
            />
            <Animated.View
              style={[styles.eye, rightEyeStyle, { width: eyeW, height: eyeH, borderRadius: eyeW / 2 }]}
            />
          </View>
          <Animated.View style={[styles.mouth, mouthStyle]} />
          <View
            style={[
              styles.cheek,
              {
                width: cheekW,
                height: cheekH,
                borderRadius: cheekH / 2,
                top: cheekTop,
                left: bodySize * 0.18,
              },
            ]}
          />
          <View
            style={[
              styles.cheek,
              {
                width: cheekW,
                height: cheekH,
                borderRadius: cheekH / 2,
                top: cheekTop,
                right: bodySize * 0.18,
              },
            ]}
          />
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
  body: {
    backgroundColor: colors.blobBody,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
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
    paddingTop: '8%',
  },
  eyes: {
    flexDirection: 'row',
    marginBottom: '10%',
  },
  eye: {
    backgroundColor: colors.text,
  },
  mouth: {
    backgroundColor: colors.text,
  },
  cheek: {
    position: 'absolute',
    backgroundColor: colors.blobCheek,
    opacity: 0.65,
  },
});
