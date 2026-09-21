import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeaderboardModal } from '../components/LeaderboardModal';
import { StreakPill } from '../components/StreakPill';
import { useStreak } from '../hooks/useStreak';
import {
  getCustomScenarios,
  getOnboarding,
  getProfile,
  saveCustomScenario,
  saveOnboarding,
} from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  DEFAULT_SCENARIOS,
  LANGUAGE_OPTIONS,
  type OnboardingData,
  type Scenario,
  type ScenarioDifficulty,
  type UserProfile,
} from '../types';

const DIFFICULTY_COLOR: Record<ScenarioDifficulty, string> = {
  easy: colors.success,
  medium: colors.warning,
  hard: colors.accent,
};

export function HomeScreen() {
  const { streak, refresh } = useStreak();
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [customScenarios, setCustomScenarios] = useState<Scenario[]>([]);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const load = useCallback(async () => {
    const data = await getOnboarding();
    if (!data) {
      router.replace('/onboarding');
      return;
    }
    setOnboarding(data);
    setProfile(await getProfile());
    setCustomScenarios(await getCustomScenarios());
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

  const languageMeta = LANGUAGE_OPTIONS.find((l) => l.value === onboarding?.language);

  const startScenario = async (scenario: Scenario) => {
    if (!onboarding) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await saveOnboarding({ ...onboarding, scenario });
    router.push('/session');
  };

  const saveCustom = async () => {
    if (!customTitle.trim() || !customPrompt.trim() || !onboarding) return;
    const scenario: Scenario = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      prompt: customPrompt.trim(),
      isCustom: true,
      icon: '✨',
      difficulty: 'medium',
    };
    const list = await saveCustomScenario(scenario);
    setCustomScenarios(list);
    setCustomOpen(false);
    setCustomTitle('');
    setCustomPrompt('');
    await startScenario(scenario);
  };

  const changeLanguage = async (value: OnboardingData['language']) => {
    if (!onboarding) return;
    void Haptics.selectionAsync();
    const next = { ...onboarding, language: value };
    await saveOnboarding(next);
    setOnboarding(next);
    setLangOpen(false);
  };

  if (!onboarding || !profile) {
    return <View style={styles.loading} />;
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.backgroundWarm, colors.background]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <Pressable style={styles.langSelector} onPress={() => setLangOpen(true)}>
            <Text style={styles.langFlag}>{languageMeta?.flag ?? '🌐'}</Text>
            <Text style={styles.langName}>{languageMeta?.label ?? onboarding.language}</Text>
            <Text style={styles.chevron}>▾</Text>
          </Pressable>

          <View style={styles.topRight}>
            <StreakPill streak={streak} />
            <Pressable
              style={styles.iconBtn}
              onPress={() => setLeaderboardOpen(true)}
              hitSlop={8}
            >
              <Text style={styles.iconBtnText}>🏆</Text>
            </Pressable>
            <Pressable
              style={styles.avatarBtn}
              onPress={() => router.push('/onboarding')}
              hitSlop={8}
            >
              <Text style={styles.avatarText}>
                {(profile.displayName || 'Y').charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(420)}>
            <Text style={styles.greeting}>Ready to speak?</Text>
            <Text style={styles.greetingSub}>
              {profile.xp} XP · Pick a scenario and jump in
            </Text>
          </Animated.View>

          <Pressable style={styles.customCta} onPress={() => setCustomOpen(true)}>
            <Text style={styles.customCtaPlus}>+</Text>
            <Text style={styles.customCtaText}>Custom Scenario</Text>
          </Pressable>

          <View style={styles.scenarioList}>
            {scenarios.map((scenario, index) => (
              <Animated.View
                key={scenario.id}
                entering={FadeInRight.delay(40 * index).duration(360)}
              >
                <Pressable
                  style={styles.scenarioRow}
                  onPress={() => void startScenario(scenario)}
                >
                  <View style={styles.scenarioIconWrap}>
                    <Text style={styles.scenarioIcon}>{scenario.icon ?? '💬'}</Text>
                  </View>
                  <View style={styles.scenarioBody}>
                    <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                    <Text style={styles.scenarioPrompt} numberOfLines={2}>
                      {scenario.prompt}
                    </Text>
                  </View>
                  {scenario.difficulty ? (
                    <View
                      style={[
                        styles.diffTag,
                        { backgroundColor: DIFFICULTY_COLOR[scenario.difficulty] + '22' },
                      ]}
                    >
                      <Text
                        style={[
                          styles.diffText,
                          { color: DIFFICULTY_COLOR[scenario.difficulty] },
                        ]}
                      >
                        {scenario.difficulty}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              </Animated.View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>

      <LeaderboardModal
        visible={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        profile={profile}
        streak={streak}
      />

      <Modal visible={customOpen} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Custom scenario</Text>
            <TextInput
              style={styles.input}
              placeholder="Title"
              placeholderTextColor={colors.textLight}
              value={customTitle}
              onChangeText={setCustomTitle}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="What should you practice? e.g. booking a train ticket"
              placeholderTextColor={colors.textLight}
              value={customPrompt}
              onChangeText={setCustomPrompt}
              multiline
            />
            <Pressable
              style={[
                styles.primaryButton,
                (!customTitle.trim() || !customPrompt.trim()) && styles.disabled,
              ]}
              disabled={!customTitle.trim() || !customPrompt.trim()}
              onPress={() => void saveCustom()}
            >
              <Text style={styles.primaryButtonText}>Start practicing</Text>
            </Pressable>
            <Pressable style={styles.cancelLink} onPress={() => setCustomOpen(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={langOpen} animationType="fade" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setLangOpen(false)}>
          <View style={styles.langSheet}>
            <Text style={styles.modalTitle}>Target language</Text>
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
                <View>
                  <Text style={styles.langOptionLabel}>{opt.label}</Text>
                  <Text style={styles.langOptionNative}>{opt.nativeLabel}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  loading: { flex: 1, backgroundColor: colors.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  langFlag: { fontSize: 18 },
  langName: {
    ...typography.label,
    color: colors.text,
  },
  chevron: {
    color: colors.textMuted,
    fontSize: 12,
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconBtnText: { fontSize: 16 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
  },
  avatarText: {
    ...typography.label,
    color: colors.primaryDark,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  greeting: {
    ...typography.display,
    color: colors.text,
    marginTop: 8,
  },
  greetingSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  customCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 15,
    marginBottom: 20,
  },
  customCtaPlus: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
    marginTop: -2,
  },
  customCtaText: {
    ...typography.label,
    color: '#fff',
    fontSize: 15,
  },
  scenarioList: { gap: 10 },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scenarioIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scenarioIcon: { fontSize: 22 },
  scenarioBody: { flex: 1 },
  scenarioTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  scenarioPrompt: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  diffTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  diffText: {
    ...typography.tiny,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  langSheet: {
    backgroundColor: colors.surface,
    margin: 24,
    marginTop: 'auto',
    marginBottom: 'auto',
    borderRadius: 24,
    padding: 20,
  },
  modalTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    ...typography.body,
    color: colors.text,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryButtonText: {
    ...typography.label,
    color: '#fff',
    fontSize: 16,
  },
  disabled: { opacity: 0.45 },
  cancelLink: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { ...typography.label, color: colors.textMuted },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  langOptionActive: {
    backgroundColor: colors.primarySoft,
  },
  langOptionLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  langOptionNative: {
    ...typography.tiny,
    color: colors.textMuted,
  },
});
