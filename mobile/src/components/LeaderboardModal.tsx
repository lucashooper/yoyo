import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { LeaderboardEntry, UserProfile } from '../types';

interface Props {
  visible: boolean;
  onClose: () => void;
  profile: UserProfile;
  streak: number;
}

const COMMUNITY: Omit<LeaderboardEntry, 'rank' | 'isCurrentUser'>[] = [
  { id: 'u1', name: 'Mika', xp: 1840, streak: 21 },
  { id: 'u2', name: 'Sofia', xp: 1620, streak: 14 },
  { id: 'u3', name: 'Kenji', xp: 1410, streak: 9 },
  { id: 'u4', name: 'Aya', xp: 1180, streak: 12 },
  { id: 'u5', name: 'Leo', xp: 960, streak: 5 },
];

export function LeaderboardModal({ visible, onClose, profile, streak }: Props) {
  const entries = useMemo(() => {
    const you: LeaderboardEntry = {
      id: profile.id,
      name: profile.displayName || 'You',
      xp: profile.xp,
      streak,
      rank: 0,
      isCurrentUser: true,
    };
    const community: LeaderboardEntry[] = COMMUNITY.map((e) => ({
      ...e,
      rank: 0,
      isCurrentUser: false,
    }));
    const merged = [...community, you]
      .sort((a, b) => b.xp - a.xp)
      .map((e, i) => ({ ...e, rank: i + 1 }));
    return merged;
  }, [profile, streak]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Progress & rankings</Text>
          <Text style={styles.subtitle}>Weekly streak and community XP</Text>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{profile.xp}</Text>
              <Text style={styles.metricLabel}>XP</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{streak}</Text>
              <Text style={styles.metricLabel}>Day streak</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{profile.totalSessions}</Text>
              <Text style={styles.metricLabel}>Sessions</Text>
            </View>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {entries.map((entry) => (
              <View
                key={entry.id}
                style={[styles.row, entry.isCurrentUser && styles.rowYou]}
              >
                <Text style={styles.rank}>{entry.rank}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.name}>
                    {entry.name}
                    {entry.isCurrentUser ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.meta}>
                    🔥 {entry.streak} · {entry.xp} XP
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <Pressable style={styles.close} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
    maxHeight: '82%',
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 18,
  },
  metrics: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  metric: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  metricValue: {
    ...typography.title,
    color: colors.primaryDark,
  },
  metricLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  list: { maxHeight: 280 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowYou: {
    backgroundColor: colors.primarySoft,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderBottomWidth: 0,
  },
  rank: {
    ...typography.subtitle,
    color: colors.textMuted,
    width: 28,
    textAlign: 'center',
  },
  rowBody: { flex: 1 },
  name: {
    ...typography.subtitle,
    color: colors.text,
  },
  meta: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  close: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 12,
  },
  closeText: {
    ...typography.label,
    color: colors.primary,
  },
});
