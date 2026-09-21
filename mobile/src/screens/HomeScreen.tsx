import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

        <View style={styles.content}>
          <Text style={styles.lessonTitle}>{onboarding.scenario.title}</Text>
          <Text style={styles.lessonPrompt}>{onboarding.scenario.prompt}</Text>
          <View style={styles.metaPill}>
            <Text style={styles.metaText}>{languageLabel}</Text>
          </View>

          <Pressable style={styles.resumeButton} onPress={() => router.push('/session')}>
            <Text style={styles.resumeText}>Resume session</Text>
          </Pressable>

          <Pressable style={styles.linkButton} onPress={() => router.push('/onboarding')}>
            <Text style={styles.linkText}>Change scenario</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFC' },
  loading: { flex: 1, backgroundColor: '#F9FAFC' },
  container: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  lessonTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  lessonPrompt: {
    ...typography.body,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 16,
    letterSpacing: 0.2,
  },
  metaPill: {
    backgroundColor: 'rgba(107, 114, 128, 0.08)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 8,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  resumeButton: {
    marginTop: 32,
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  resumeText: {
    ...typography.label,
    color: '#fff',
    fontSize: 15,
  },
  linkButton: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
  },
});
