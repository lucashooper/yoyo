import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';

interface WaveLogoProps {
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

const SIZES = {
  sm: { barW: 8, barH: 22, gap: 6, dot: 8 },
  md: { barW: 12, barH: 34, gap: 8, dot: 12 },
  lg: { barW: 16, barH: 48, gap: 10, dot: 16 },
};

function AnimatedBar({
  color,
  width,
  height,
  delay,
  animate,
}: {
  color: string;
  width: number;
  height: number;
  delay: number;
  animate: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!animate) {
      scale.value = 1;
      return;
    }
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 320 + delay }),
        withTiming(0.88, { duration: 280 + delay }),
        withTiming(1, { duration: 260 }),
      ),
      -1,
      false,
    );
  }, [animate, delay, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { width, height, backgroundColor: color, borderRadius: width / 2 },
        style,
      ]}
    />
  );
}

export function WaveLogo({ size = 'md', animated = false }: WaveLogoProps) {
  const s = SIZES[size];

  return (
    <View style={[styles.row, { gap: s.gap }]}>
      <AnimatedBar
        color={colors.pingoBlue}
        width={s.barW}
        height={s.barH}
        delay={0}
        animate={animated}
      />
      <AnimatedBar
        color={colors.pingoYellow}
        width={s.barW}
        height={s.barH * 1.15}
        delay={80}
        animate={animated}
      />
      <AnimatedBar
        color={colors.pingoPink}
        width={s.barW}
        height={s.barH * 0.95}
        delay={160}
        animate={animated}
      />
      <View
        style={{
          width: s.dot,
          height: s.dot,
          borderRadius: s.dot / 2,
          backgroundColor: colors.pingoBlue,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bar: {},
});
