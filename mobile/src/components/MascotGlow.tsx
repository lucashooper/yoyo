import React, { useEffect } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface MascotGlowProps {
  children: React.ReactNode;
  /** Visual diameter of the mascot (not the pulse canvas) */
  size?: number;
  /** 0–1 audio level — drives pulse when active */
  amplitude?: number;
  /** Show restrained pulse rings (session only) */
  active?: boolean;
  style?: ViewStyle;
}

/**
 * Minimal ambient pulse — thin rings, low opacity, max ~1.12× scale.
 * Home/onboarding: pass active={false} for a clean flat frame only.
 */
export function MascotGlow({
  children,
  size = 120,
  amplitude = 0,
  active = false,
  style,
}: MascotGlowProps) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) {
      pulse.value = withTiming(0, { duration: 200 });
      return;
    }
    const level = Math.min(1, amplitude * 1.2 + 0.08);
    pulse.value = withRepeat(
      withSequence(
        withTiming(level, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(level * 0.4, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [active, amplitude, pulse]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.08 + pulse.value * 0.12,
    transform: [{ scale: 1 + pulse.value * 0.12 }],
  }));

  const frameSize = size;

  return (
    <View style={[styles.wrap, { width: frameSize, height: frameSize }, style]}>
      {active && (
        <Animated.View
          style={[
            styles.ring,
            ringStyle,
            {
              width: frameSize,
              height: frameSize,
              borderRadius: frameSize / 2,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.frame,
          {
            width: frameSize,
            height: frameSize,
            borderRadius: frameSize / 2,
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.35)',
    backgroundColor: 'rgba(0, 122, 255, 0.04)',
  },
  frame: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
});
