import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { StreakFlameIcon } from './StreakFlameIcon';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface StreakPillProps {
  streak: number;
  compact?: boolean;
  onPress?: () => void;
}

export function StreakPill({ streak, compact = false, onPress }: StreakPillProps) {
  const content = (
    <>
      <Text style={styles.count}>{streak}</Text>
      <StreakFlameIcon size={compact ? 18 : 20} />
      {!compact && (
        <Text style={styles.text}>day{streak === 1 ? '' : 's'}</Text>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable style={[styles.pill, compact && styles.pillCompact]} onPress={onPress}>
        {content}
      </Pressable>
    );
  }

  return <View style={[styles.pill, compact && styles.pillCompact]}>{content}</View>;
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
