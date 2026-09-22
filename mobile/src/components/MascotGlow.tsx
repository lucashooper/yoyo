import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

interface MascotGlowProps {
  children: React.ReactNode;
  size?: number;
  style?: ViewStyle;
}

/** Soft ambient halo behind Nobi mascot / session visualizer */
export function MascotGlow({ children, size = 160, style }: MascotGlowProps) {
  return (
    <View style={[styles.wrap, { width: size * 1.35, height: size * 1.35 }, style]}>
      <View style={[styles.glowOuter, { width: size * 1.2, height: size * 1.2, borderRadius: size * 0.6 }]} />
      <View style={[styles.glowInner, { width: size * 1.05, height: size * 1.05, borderRadius: size * 0.525 }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowOuter: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 122, 255, 0.08)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  },
  glowInner: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 122, 255, 0.06)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
