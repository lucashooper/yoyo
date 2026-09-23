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
  const energy = useSharedValue(0);
  const scaleBoost = useSharedValue(0);
  const tilt = useSharedValue(0);
  const blink = useSharedValue(1);
  const [energyLevel, setEnergyLevel] = useState(0);

  useAnimatedReaction(
    () => energy.value,
    (current) => {
      runOnJS(setEnergyLevel)(current);
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
    const level = Math.min(1, amplitude);

    if (softAura) {
      energy.value = withTiming(0, { duration: 200 });
      return;
    }

    if (state === 'speaking' || state === 'user_speaking') {
      energy.value = withTiming(0.35 + level * 0.65, { duration: 90 });
    } else if (state === 'thinking') {
      energy.value = withTiming(0.25, { duration: 180 });
    } else {
      energy.value = withTiming(0.08, { duration: 220 });
    }

    scaleBoost.value = withSpring(
      state === 'speaking' || state === 'user_speaking' ? level * 0.04 : 0,
      { damping: 14, stiffness: 180 },
    );
    tilt.value = withSpring(state === 'thinking' ? -2 : 0, { damping: 12, stiffness: 120 });
  }, [amplitude, energy, scaleBoost, softAura, state, tilt]);

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
        <NobiMascotSvg size={size} energy={energyLevel} />
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
