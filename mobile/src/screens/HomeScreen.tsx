import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NobiAvatar } from '../components/NobiAvatar';
import { StreakPill } from '../components/StreakPill';
import { useStreak } from '../hooks/useStreak';
import { getOnboarding } from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { OnboardingData } from '../types';

export function HomeScreen() {
  const { streak } = useStreak();
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);

  const load = useCallback(async () => {
    const data = await getOnboarding();
    if (!data) {
      router.replace('/onboarding');
      return;
    }
    setOnboarding(data);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!onboarding) {
    return <View style={styles.loading} />;
  }

  const languageLabel =
    onboarding.language.charAt(0).toUpperCase() + onboarding.language.slice(1);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <StreakPill streak={streak} />
        </View>

        <Animated.View entering={FadeInUp.duration(500).delay(100)} style={styles.card}>
          <NobiAvatar state="idle" size={160} />
          <Text style={styles.greeting}>Ready when you are</Text>
          <Text style={styles.lessonTitle}>{onboarding.scenario.title}</Text>
          <Text style={styles.lessonPrompt}>{onboarding.scenario.prompt}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaPill}>
              <Text style={styles.metaText}>{languageLabel}</Text>
            </View>
          </View>

          <Pressable
            style={styles.startButton}
            onPress={() => router.push('/session')}
          >
            <Text style={styles.startButtonText}>Start</Text>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(500).delay(220)} style={styles.planHint}>
          <Text style={styles.planHintText}>My plan</Text>
          <Text style={styles.planSubtext}>Swipe up during a session to review your transcript</Text>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundWarm },
  loading: { flex: 1, backgroundColor: colors.backgroundWarm },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 32,
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 20,
  },
  lessonTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  lessonPrompt: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  metaRow: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 28,
  },
  metaPill: {
    backgroundColor: colors.background,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  metaText: {
    ...typography.tiny,
    color: colors.primary,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 18,
    paddingHorizontal: 64,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
  },
  startButtonText: {
    ...typography.subtitle,
    color: '#fff',
  },
  planHint: {
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  planHintText: {
    ...typography.label,
    color: colors.text,
  },
  planSubtext: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 4,
  },
});
