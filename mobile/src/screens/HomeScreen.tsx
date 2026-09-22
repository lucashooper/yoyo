import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MyPlanDrawer } from '../components/MyPlanDrawer';
import { StreakPill } from '../components/StreakPill';
import { WaveLogo } from '../components/WaveLogo';
import { useStreak } from '../hooks/useStreak';
import {
  getCustomScenarios,
  getFreeSessionsRemaining,
  getOnboarding,
  saveOnboarding,
} from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  DEFAULT_SCENARIOS,
  FIRST_LESSON,
  LANGUAGE_OPTIONS,
  type OnboardingData,
  type Scenario,
} from '../types';

export function HomeScreen() {
  const { streak, refresh } = useStreak();
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [freeSessions, setFreeSessions] = useState(5);
  const [langOpen, setLangOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [lessonIndex, setLessonIndex] = useState(0);

  const load = useCallback(async () => {
    const data = await getOnboarding();
    if (!data) {
      router.replace('/onboarding');
      return;
    }
    setOnboarding(data);
    setCustomScenarios(await getCustomScenarios());
    setFreeSessions(await getFreeSessionsRemaining());
    await refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const scenarios = useMemo(() => {
    const defaults = DEFAULT_SCENARIOS.map((s, i) => ({ ...s, id: `scenario_${i}` }));
    return [...customScenarios, ...defaults];
  }, [customScenarios]);

  const focusLessons = useMemo(() => {
    const first = {
      ...DEFAULT_SCENARIOS[FIRST_LESSON.scenarioIndex]!,
      id: 'lesson_focus_0',
    };
    return [first, ...scenarios.filter((s) => s.id !== first.id)].slice(0, 5);
  }, [scenarios]);

  const activeLesson = focusLessons[lessonIndex] ?? focusLessons[0];
  const languageMeta = LANGUAGE_OPTIONS.find((l) => l.value === onboarding?.language);

  const startLesson = async (scenario: Scenario) => {
    if (!onboarding) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveOnboarding({ ...onboarding, scenario });
    router.push('/session');
  };

  const changeLanguage = async (value: OnboardingData['language']) => {
    if (!onboarding) return;
    void Haptics.selectionAsync();
    const next = { ...onboarding, language: value };
    await saveOnboarding(next);
    setOnboarding(next);
    setLangOpen(false);
  };

  if (!onboarding) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <Pressable style={styles.langPill} onPress={() => setLangOpen(true)}>
            <Text style={styles.langFlag}>{languageMeta?.flag ?? '🌐'}</Text>
            <Text style={styles.langLevel}>L1</Text>
          </Pressable>

          <StreakPill streak={streak} compact />
        </View>

        <Pressable style={styles.progressToggle} onPress={() => setProgressOpen((v) => !v)}>
          <Text style={styles.progressLabel}>My progress</Text>
          <Text style={styles.progressChevron}>{progressOpen ? '▴' : '▾'}</Text>
        </Pressable>

        {progressOpen && (
          <Animated.View entering={FadeInUp.duration(280)} style={styles.progressPanel}>
            <Text style={styles.progressMeta}>
              {onboarding.proficiency} · {onboarding.motivation} · {freeSessions} free sessions
            </Text>
          </Animated.View>
        )}

        <View style={styles.center}>
          <Animated.View layout={LinearTransition.springify()} style={styles.focusCard}>
            <WaveLogo size="md" animated />
            <Text style={styles.lessonSubtitle}>{FIRST_LESSON.subtitle}</Text>
            <Text style={styles.lessonTitle}>{activeLesson?.title ?? FIRST_LESSON.title}</Text>
            <Pressable
              style={styles.startBtn}
              onPress={() => activeLesson && void startLesson(activeLesson)}
            >
              <Text style={styles.startBtnText}>Start</Text>
            </Pressable>
            <View style={styles.dots}>
              {focusLessons.map((_, i) => (
                <Pressable key={i} onPress={() => setLessonIndex(i)} hitSlop={8}>
                  <View style={[styles.dot, i === lessonIndex && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>

        <MyPlanDrawer
          onboarding={onboarding}
          scenarios={scenarios}
          freeSessionsRemaining={freeSessions}
          onStartScenario={(s) => void startLesson(s)}
        />
      </SafeAreaView>

      <Modal visible={langOpen} animationType="fade" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangOpen(false)}>
          <View style={styles.langSheet}>
            <Text style={styles.sheetTitle}>Language</Text>
            {LANGUAGE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.langOption,
                  onboarding.language === opt.value && styles.langOptionActive,
                ]}
                onPress={() => void changeLanguage(opt.value)}
              >
                <Text style={styles.langFlag}>{opt.flag}</Text>
                <Text style={styles.langOptionLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.canvas },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  langFlag: { fontSize: 16 },
  langLevel: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
  },
  progressToggle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  progressLabel: {
    ...typography.label,
    color: colors.pingoBlue,
  },
  progressChevron: {
    color: colors.pingoBlue,
    fontSize: 10,
    marginTop: 2,
  },
  progressPanel: {
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  progressMeta: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  focusCard: {
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  lessonSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 20,
  },
  lessonTitle: {
    ...typography.hero,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 44,
  },
  startBtn: {
    backgroundColor: colors.pingoBlue,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginTop: 12,
    shadowColor: colors.pingoBlue,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  startBtnText: {
    ...typography.label,
    color: '#fff',
    fontSize: 17,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 22,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.pingoBlue,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  langSheet: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
  },
  sheetTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 12,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  langOptionActive: { backgroundColor: '#EBF3FE' },
  langOptionLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
});
