import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StreakPillProps {
  streak: number;
}

export function StreakPill({ streak }: StreakPillProps) {
  return (
    <View style={styles.pill}>
      <Text style={styles.emoji}>🔥</Text>
      <Text style={styles.text}>
        {streak} day{streak === 1 ? '' : 's'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 14,
  },
  text: {
    ...typography.label,
    color: colors.text,
    fontSize: 12,
  },
});
