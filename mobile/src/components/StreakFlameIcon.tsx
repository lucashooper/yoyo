import React from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { colors } from '../theme/colors';

interface StreakFlameIconProps {
  size?: number;
}

/** Custom Nobi streak flame — warm orange gradient, not emoji. */
export function StreakFlameIcon({ size = 22 }: StreakFlameIconProps) {
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Defs>
          <LinearGradient id="flameGrad" x1="12" y1="2" x2="12" y2="22">
            <Stop offset="0" stopColor={colors.flameHighlight} />
            <Stop offset="0.45" stopColor={colors.flameCore} />
            <Stop offset="1" stopColor={colors.flameDeep} />
          </LinearGradient>
        </Defs>
        <Path
          d="M12 2C12 2 8 7.5 8 11.5C8 14.5 9.8 17 12 17C14.2 17 16 14.5 16 11.5C16 7.5 12 2 12 2Z"
          fill="url(#flameGrad)"
        />
        <Path
          d="M12 10C12 10 10 12.5 10 14.2C10 15.6 10.9 16.8 12 16.8C13.1 16.8 14 15.6 14 14.2C14 12.5 12 10 12 10Z"
          fill={colors.flameInner}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({});
