import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { VoiceSessionState } from '../types';
import { NobiMascotSvg } from './NobiMascotSvg';

interface NobiAvatarProps {
  state?: VoiceSessionState;
  amplitude?: number;
  size?: number;
  softAura?: boolean;
}

/** Static mascot container — scales cleanly on any screen size. */
export function NobiAvatar({ size = 180 }: NobiAvatarProps) {
  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      <NobiMascotSvg size={size} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
