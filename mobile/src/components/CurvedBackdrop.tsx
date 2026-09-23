import React from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const { width: SCREEN_W } = Dimensions.get('window');

interface CurvedBackdropProps {
  variant: 'top' | 'bottom';
  height?: number;
  fill?: string;
}

/** Pingo-style soft cream wave behind header or footer */
export function CurvedBackdrop({
  variant,
  height = 120,
  fill = '#F9FAFC',
}: CurvedBackdropProps) {
  const path =
    variant === 'top'
      ? `M0 0 H${SCREEN_W} V${height * 0.55} Q${SCREEN_W / 2} ${height} 0 ${height * 0.55} Z`
      : `M0 ${height} H${SCREEN_W} V${height * 0.45} Q${SCREEN_W / 2} 0 0 ${height * 0.45} Z`;

  return (
    <View
      pointerEvents="none"
      style={[
        variant === 'top' ? styles.top : styles.bottom,
        { height },
      ]}
    >
      <Svg width={SCREEN_W} height={height} viewBox={`0 0 ${SCREEN_W} ${height}`}>
        <Path d={path} fill={fill} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
});
