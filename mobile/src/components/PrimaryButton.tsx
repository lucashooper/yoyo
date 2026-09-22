import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, type PressableProps, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  fullWidth?: boolean;
  size?: 'md' | 'lg' | 'hero';
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
        size === 'hero' && styles.hero,
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
      <Text
        style={[
          styles.label,
          size === 'hero' && styles.labelHero,
          size === 'md' && styles.labelMd,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  hero: {
    borderRadius: 9999,
    paddingVertical: 16,
    paddingHorizontal: 48,
    minHeight: 54,
    borderWidth: 0,
  },
  md: {
    paddingVertical: 13,
    paddingHorizontal: 28,
    minHeight: 46,
    borderRadius: 12,
  },
  fullWidth: {
    width: '100%',
    paddingHorizontal: 24,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    ...typography.label,
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '600',
  },
  labelHero: {
    fontSize: 18,
    fontWeight: '700',
  },
  labelMd: {
    fontSize: 16,
  },
});
