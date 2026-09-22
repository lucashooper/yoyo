import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface AudioWaveBarProps {
  amplitude: number;
  active?: boolean;
}

const BAR_COUNT = 20;

function WaveBar({
  level,
  index,
}: {
  level: SharedValue<number>;
  index: number;
}) {
  const style = useAnimatedStyle(() => ({
    height: 6 + level.value * 52,
    opacity: 0.35 + level.value * 0.65,
  }));

  const mid = BAR_COUNT / 2;
  const dist = Math.abs(index - mid) / mid;

  return (
    <Animated.View
      style={[
        styles.bar,
        style,
        {
          backgroundColor:
            dist < 0.35 ? colors.waveActive : dist < 0.7 ? colors.primaryLight : colors.waveIdle,
        },
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
  const l16 = useSharedValue(0.1);
  const l17 = useSharedValue(0.1);
  const l18 = useSharedValue(0.1);
  const l19 = useSharedValue(0.1);

  const bars = useMemo(
    () => [
      l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19,
    ],
    [l0, l1, l2, l3, l4, l5, l6, l7, l8, l9, l10, l11, l12, l13, l14, l15, l16, l17, l18, l19],
  );

  useEffect(() => {
    bars.forEach((level, index) => {
      const offset = Math.sin((index / BAR_COUNT) * Math.PI * 2 + Date.now() / 280);
      const boosted = Math.min(1, amplitude * 1.5);
      const target = active
        ? Math.max(0.12, Math.min(1, boosted * (0.65 + Math.abs(offset) * 0.35)))
        : 0.08;
      level.value = withSpring(target, { damping: 16, stiffness: 210 });
    });
  }, [amplitude, active, bars]);

  return (
    <View style={styles.container}>
      {bars.map((level, index) => (
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
    height: 64,
    paddingHorizontal: 24,
    marginVertical: 8,
  },
  bar: {
    width: 4,
    borderRadius: 4,
  },
});
