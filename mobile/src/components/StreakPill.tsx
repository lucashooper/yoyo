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
      <Text style={styles.text}>{streak} day{streak === 1 ? '' : 's'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    gap: 6,
    shadowColor: colors.streak,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emoji: {
    fontSize: 16,
  },
  text: {
    ...typography.label,
    color: colors.text,
  },
});
