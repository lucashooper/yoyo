import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
interface AudioWaveBarProps {
  amplitude: number;
  active?: boolean;
}

const BAR_COUNT = 16;

function WaveBar({
  level,
  index,
}: {
  level: SharedValue<number>;
  index: number;
}) {
  const style = useAnimatedStyle(() => ({
    height: withTiming(4 + level.value * 28, { duration: 80 }),
    opacity: 0.35 + level.value * 0.5,
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        style,
        { backgroundColor: index % 2 === 0 ? '#9CA3AF' : '#6B7280' },
      ]}
    />
  );
}

export function AudioWaveBar({ amplitude, active = true }: AudioWaveBarProps) {
  const l0 = useSharedValue(0.1);
  const l1 = useSharedValue(0.1);
  const l2 = useSharedValue(0.1);
  const l3 = useSharedValue(0.1);
  const l4 = useSharedValue(0.1);
  const l5 = useSharedValue(0.1);
  const l6 = useSharedValue(0.1);
  const l7 = useSharedValue(0.1);
  const l8 = useSharedValue(0.1);
  const l9 = useSharedValue(0.1);
  const l10 = useSharedValue(0.1);
  const l11 = useSharedValue(0.1);
  const l12 = useSharedValue(0.1);
  const l13 = useSharedValue(0.1);
  const l14 = useSharedValue(0.1);
  const l15 = useSharedValue(0.1);

  const levels = useMemo(
    () => [l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15],
    [l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15],
  );

  useEffect(() => {
    levels.forEach((level, index) => {
      const offset = Math.sin((index / BAR_COUNT) * Math.PI * 2 + Date.now() / 300);
      const target = active
        ? Math.max(0.08, Math.min(1, amplitude * (0.55 + Math.abs(offset) * 0.45)))
        : 0.08;
      level.value = withSpring(target, { damping: 16, stiffness: 200 });
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
    gap: 3,
    height: 36,
    paddingHorizontal: 20,
  },
  bar: {
    width: 3,
    borderRadius: 3,
  },
});
