import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StreakPillProps {
  streak: number;
  compact?: boolean;
}

export function StreakPill({ streak, compact = false }: StreakPillProps) {
  return (
    <View style={[styles.pill, compact && styles.pillCompact]}>
      <Text style={styles.count}>{streak}</Text>
      <Text style={styles.emoji}>🔥</Text>
      {!compact && (
        <Text style={styles.text}>
          day{streak === 1 ? '' : 's'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 4,
  },
  pillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  count: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
    fontSize: 13,
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
