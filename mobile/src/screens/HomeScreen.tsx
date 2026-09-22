import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LanguageLearningOverlay } from '../components/LanguageLearningOverlay';
import { LearningPathSheet } from '../components/LearningPathSheet';
import { MascotGlow } from '../components/MascotGlow';
import { NobiAvatar } from '../components/NobiAvatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { StreakPill } from '../components/StreakPill';
import { useStreak } from '../hooks/useStreak';
import { previewLanguageVoice } from '../services/languagePreview';
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
  type ProficiencyLevel,
  type Scenario,
} from '../types';

function levelShort(proficiency: ProficiencyLevel): string {
  if (proficiency === 'beginner') return 'L1';
  if (proficiency === 'intermediate') return 'L2';
  return 'L3';
}

export function HomeScreen() {
  const { streak, refresh } = useStreak();
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [freeSessions, setFreeSessions] = useState(5);
  const [langOpen, setLangOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
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

  const startRoleplay = async () => {
    if (!onboarding) return;
    const scenario: Scenario = {
      id: `roleplay_${Date.now()}`,
      title: 'Free roleplay',
      prompt: 'Open-ended conversation practice. Adapt to whatever the learner wants to discuss.',
      isCustom: true,
      icon: '🎭',
    };
    await startLesson(scenario);
    setPlanOpen(false);
  };

  const changeLanguage = async (value: OnboardingData['language']) => {
    if (!onboarding) return;
    void Haptics.selectionAsync();
    const next = { ...onboarding, language: value };
    await saveOnboarding(next);
    setOnboarding(next);
    previewLanguageVoice(value);
  };

  if (!onboarding) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable style={styles.chip} onPress={() => setLangOpen(true)}>
            <Text style={styles.chipFlag}>{languageMeta?.flag ?? '🌐'}</Text>
            <Text style={styles.chipText}>{levelShort(onboarding.proficiency)}</Text>
          </Pressable>

          <Pressable style={styles.progressChip} onPress={() => setPlanOpen(true)}>
            <Text style={styles.progressText}>My progress</Text>
            <Text style={styles.progressChevron}>▾</Text>
          </Pressable>

          <StreakPill streak={streak} compact onPress={() => router.push('/streak')} />
        </View>

        <View style={styles.center}>
          <Animated.View layout={LinearTransition.duration(250)} style={styles.focusCard}>
            <MascotGlow size={150}>
              <NobiAvatar state="idle" size={130} softAura />
            </MascotGlow>
            <Text style={styles.lessonSubtitle}>{FIRST_LESSON.subtitle}</Text>
            <Text style={styles.lessonTitle}>{activeLesson?.title ?? FIRST_LESSON.title}</Text>
            <PrimaryButton
              title="Start"
              onPress={() => activeLesson && void startLesson(activeLesson)}
              style={styles.startBtn}
            />
            <View style={styles.dots}>
              {focusLessons.map((_, i) => (
                <Pressable key={i} onPress={() => setLessonIndex(i)} hitSlop={8}>
                  <View style={[styles.dot, i === lessonIndex && styles.dotActive]} />
                </Pressable>
              ))}
            </View>
          </Animated.View>
        </View>

        <Pressable style={styles.planHandle} onPress={() => setPlanOpen(true)}>
          <View style={styles.planGrabber} />
          <Text style={styles.planHandleText}>My plan</Text>
        </Pressable>
      </SafeAreaView>

      <LanguageLearningOverlay
        visible={langOpen}
        onboarding={onboarding}
        onClose={() => setLangOpen(false)}
        onSelectLanguage={(lang) => void changeLanguage(lang)}
      />

      <LearningPathSheet
        visible={planOpen}
        onboarding={onboarding}
        scenarios={scenarios}
        freeSessionsRemaining={freeSessions}
        onClose={() => setPlanOpen(false)}
        onStartScenario={(s) => void startLesson(s)}
        onStartRoleplay={() => void startRoleplay()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundWarm },
  safe: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.backgroundWarm },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.chipBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chipFlag: { fontSize: 16 },
  chipText: {
    ...typography.label,
    color: colors.text,
    fontWeight: '700',
  },
  progressChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
  },
  progressText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
  progressChevron: {
    color: colors.primary,
    fontSize: 9,
    marginTop: 1,
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
    gap: 4,
  },
  lessonSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 16,
  },
  lessonTitle: {
    ...typography.hero,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: 8,
  },
  startBtn: {
    marginTop: 8,
    minWidth: 200,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  planHandle: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  planGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
  planHandleText: {
    ...typography.label,
    color: colors.primary,
    fontWeight: '600',
  },
});
