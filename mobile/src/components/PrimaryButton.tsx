import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  fullWidth?: boolean;
  size?: 'md' | 'lg';
  style?: ViewStyle;
}

export function PrimaryButton({
  title,
  fullWidth = false,
  size = 'lg',
  disabled,
  onPress,
  style,
  ...rest
}: PrimaryButtonProps) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.base,
        size === 'md' && styles.md,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      disabled={disabled}
      onPress={(e) => {
        if (!disabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      {...rest}
    >
      <Text style={[styles.label, size === 'md' && styles.labelMd]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    borderBottomWidth: 4,
    borderBottomColor: colors.primaryDark,
    paddingVertical: 16,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  md: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    minHeight: 48,
    borderRadius: 14,
  },
  fullWidth: {
    width: '100%',
    paddingHorizontal: 24,
  },
  pressed: {
    transform: [{ translateY: 2 }],
    borderBottomWidth: 2,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  labelMd: {
    fontSize: 16,
  },
});
