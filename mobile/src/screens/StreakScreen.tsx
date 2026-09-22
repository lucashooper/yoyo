import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useMemo } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StreakFlameIcon } from '../components/StreakFlameIcon';
import { useStreak } from '../hooks/useStreak';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function StreakScreen() {
  const { streak } = useStreak();
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(withTiming(1.08, { duration: 900 }), withTiming(1, { duration: 900 })),
      -1,
      false,
    );
  }, [pulse]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

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

        <View style={styles.hero}>
          <Animated.View style={[styles.flameCircle, flameStyle]}>
            <StreakFlameIcon size={64} />
            <Text style={styles.streakNumber}>{streak}</Text>
          </Animated.View>
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
                  {isToday && streak > 0 ? <StreakFlameIcon size={16} /> : null}
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
  hero: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  flameCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  streakNumber: {
    ...typography.hero,
    color: '#fff',
    fontSize: 42,
    marginTop: -4,
  },
  streakLabel: {
    ...typography.subtitle,
    color: 'rgba(255,255,255,0.95)',
    marginBottom: 8,
  },
  tagline: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 28,
  },
  dayCol: { alignItems: 'center', gap: 6 },
  dayDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    gap: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    padding: 18,
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
    paddingVertical: 16,
    marginTop: 'auto',
    marginBottom: 16,
  },
  shareText: {
    ...typography.label,
    color: colors.flameCore,
    fontSize: 16,
  },
});
