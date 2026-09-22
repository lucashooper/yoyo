import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { VoiceSessionState } from '../types';
import { NobiMascotSvg } from './NobiMascotSvg';

interface NobiAvatarProps {
  state: VoiceSessionState;
  amplitude?: number;
  size?: number;
  softAura?: boolean;
}

export function NobiAvatar({ state, amplitude = 0, size = 180, softAura = false }: NobiAvatarProps) {
  const breathe = useSharedValue(0);
  const mouthOpen = useSharedValue(0.35);
  const scaleBoost = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const [mouth, setMouth] = useState(0.35);

  useAnimatedReaction(
    () => mouthOpen.value,
    (current) => {
      runOnJS(setMouth)(current);
    },
  );

  useEffect(() => {
    if (!softAura) {
      breathe.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
          withTiming(0, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        ),
        -1,
        false,
      );
    }
  }, [breathe, softAura]);

  useEffect(() => {
    const blinkLoop = () => {
      blink.value = withSequence(
        withTiming(1, { duration: 3200 }),
        withTiming(0.08, { duration: 90 }),
        withTiming(1, { duration: 120 }),
      );
    };
    blinkLoop();
    const id = setInterval(blinkLoop, 3600);
    return () => clearInterval(id);
  }, [blink]);

  useEffect(() => {
    if (softAura) {
      mouthOpen.value = withTiming(0.35, { duration: 200 });
      return;
    }

    const level = Math.min(1, amplitude);
    if (state === 'speaking') {
      mouthOpen.value = withTiming(0.35 + level * 0.55, { duration: 90 });
    } else if (state === 'user_speaking') {
      mouthOpen.value = withTiming(0.42, { duration: 120 });
    } else {
      mouthOpen.value = withTiming(0.32, { duration: 180 });
    }

    scaleBoost.value = withSpring(
      state === 'speaking' || state === 'user_speaking' ? level * 0.04 : 0,
      { damping: 14, stiffness: 180 },
    );
    tilt.value = withSpring(state === 'thinking' ? -2 : 0, { damping: 12, stiffness: 120 });
  }, [amplitude, mouthOpen, scaleBoost, softAura, state, tilt]);

  const wrapStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: softAura ? 1 : interpolate(breathe.value, [0, 1], [1, 1.02]) + scaleBoost.value },
      { rotate: `${tilt.value}deg` },
      { scaleY: blink.value < 0.5 ? 0.98 : 1 },
    ],
  }));

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <Animated.View style={[styles.inner, wrapStyle]}>
        <NobiMascotSvg size={size} mouthOpen={mouth} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
