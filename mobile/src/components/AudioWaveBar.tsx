import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface AudioWaveBarProps {
  amplitude: number;
  active?: boolean;
}

const BAR_COUNT = 24;

function WaveBar({
  level,
  index,
}: {
  level: SharedValue<number>;
  index: number;
}) {
  const style = useAnimatedStyle(() => ({
    height: withTiming(8 + level.value * 36, { duration: 80 }),
    opacity: 0.45 + level.value * 0.55,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        style,
        { backgroundColor: index % 3 === 0 ? colors.primary : colors.primaryLight },
      ]}
    />
  );
}

export function AudioWaveBar({ amplitude, active = true }: AudioWaveBarProps) {
  const l0 = useSharedValue(0.15);
  const l1 = useSharedValue(0.15);
  const l2 = useSharedValue(0.15);
  const l3 = useSharedValue(0.15);
  const l4 = useSharedValue(0.15);
  const l5 = useSharedValue(0.15);
  const l6 = useSharedValue(0.15);
  const l7 = useSharedValue(0.15);
  const l8 = useSharedValue(0.15);
  const l9 = useSharedValue(0.15);
  const l10 = useSharedValue(0.15);
  const l11 = useSharedValue(0.15);
  const l12 = useSharedValue(0.15);
  const l13 = useSharedValue(0.15);
  const l14 = useSharedValue(0.15);
  const l15 = useSharedValue(0.15);
  const l16 = useSharedValue(0.15);
  const l17 = useSharedValue(0.15);
  const l18 = useSharedValue(0.15);
  const l19 = useSharedValue(0.15);
  const l20 = useSharedValue(0.15);
  const l21 = useSharedValue(0.15);
  const l22 = useSharedValue(0.15);
  const l23 = useSharedValue(0.15);

  const levels = useMemo(
    () => [
      l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11,
      l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23,
    ],
    [
      l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11,
      l12, l13, l14, l15, l16, l17, l18, l19, l20, l21, l22, l23,
    ],
  );

  useEffect(() => {
    levels.forEach((level, index) => {
      const offset = Math.sin((index / BAR_COUNT) * Math.PI * 2 + Date.now() / 300);
      const target = active
        ? Math.max(0.12, Math.min(1, amplitude * (0.6 + Math.abs(offset) * 0.5)))
        : 0.12;
      level.value = withSpring(target, { damping: 14, stiffness: 180 });
    });
  }, [amplitude, active, levels]);

  return (
    <View style={styles.container}>
      {levels.map((level, index) => (
        <WaveBar key={index} level={level} index={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
    paddingHorizontal: 24,
  },
  bar: {
    width: 4,
    borderRadius: 4,
  },
});
