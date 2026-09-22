import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreakFlameIcon } from '../components/StreakFlameIcon';
import { useStreak } from '../hooks/useStreak';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StreakScreen() {
  const { streak } = useStreak();

  const todayIdx = useMemo(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1;
  }, []);

  const nextMilestone = streak < 7 ? 7 : streak < 30 ? 30 : 100;
  const bestStreak = Math.max(streak, 1);

  const shareStreak = async () => {
    try {
      await Share.share({
        message: `I'm on a ${streak}-day speaking streak with Nobi! 🔥`,
      });
    } catch {
      /* user cancelled */
    }
  };

  return (
    <LinearGradient
      colors={[colors.flameHighlight, colors.flameCore, colors.flameDeep]}
      locations={[0, 0.5, 1]}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>Streak</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.hero}>
            <View style={styles.flameCircle}>
              <StreakFlameIcon size={80} />
              <Text style={styles.streakNumber}>{streak}</Text>
            </View>
            <Text style={styles.streakLabel}>day{streak === 1 ? '' : 's'} streak</Text>
            <Text style={styles.tagline}>Keep the fire going — speak with Nobi every day!</Text>
          </View>

          <View style={styles.weekRow}>
            {DAYS.map((day, i) => {
              const active = i <= todayIdx && streak > 0;
              const isToday = i === todayIdx;
              return (
                <View key={day} style={styles.dayCol}>
                  <View
                    style={[
                      styles.dayDot,
                      active && styles.dayDotActive,
                      isToday && streak > 0 && styles.dayDotToday,
                    ]}
                  >
                    {isToday && streak > 0 ? <StreakFlameIcon size={18} /> : null}
                  </View>
                  <Text style={styles.dayLabel}>{day}</Text>
                </View>
              );
            })}
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{nextMilestone} days</Text>
              <Text style={styles.statLabel}>Next milestone</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{bestStreak} days</Text>
              <Text style={styles.statLabel}>Best streak</Text>
            </View>
          </View>

          <Pressable style={styles.shareBtn} onPress={() => void shareStreak()}>
            <Ionicons name="share-outline" size={20} color={colors.flameCore} />
            <Text style={styles.shareText}>Share streak</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.title,
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  content: {
    flex: 1,
    justifyContent: 'space-evenly',
    paddingBottom: 16,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 16,
  },
  flameCircle: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  streakNumber: {
    ...typography.hero,
    color: '#fff',
    fontSize: 52,
    marginTop: -6,
  },
  streakLabel: {
    ...typography.subtitle,
    color: 'rgba(255,255,255,0.95)',
    fontSize: 20,
    marginBottom: 10,
  },
  tagline: {
    ...typography.body,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 24,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  dayCol: { alignItems: 'center', gap: 8 },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  dayDotToday: {
    backgroundColor: colors.streakGold,
  },
  dayLabel: {
    ...typography.tiny,
    color: 'rgba(255,255,255,0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 14,
    paddingHorizontal: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
  },
  statValue: {
    ...typography.title,
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    marginHorizontal: 24,
    borderRadius: 28,
    minHeight: 56,
    paddingVertical: 16,
  },
  shareText: {
    ...typography.label,
    color: colors.flameCore,
    fontSize: 16,
  },
});
