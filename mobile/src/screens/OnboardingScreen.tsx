import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  ZoomIn,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NobiAvatar } from '../components/NobiAvatar';
import { saveOnboarding, savePlan, saveProfile, getProfile } from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  DEFAULT_SCENARIOS,
  LANGUAGE_OPTIONS,
  MOTIVATION_OPTIONS,
  PLAN_OPTIONS,
  PROFICIENCY_OPTIONS,
  type Motivation,
  type PlanTier,
  type ProficiencyLevel,
  type SupportedLanguage,
} from '../types';

type Step = 'welcome' | 'language' | 'goals' | 'account';

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>('welcome');
  const [language, setLanguage] = useState<SupportedLanguage>('spanish');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('beginner');
  const [motivation, setMotivation] = useState<Motivation>('daily');
  const [paywallVisible, setPaywallVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Exclude<PlanTier, 'guest'>>('yearly');

  const defaultScenario = useMemo(
    () => ({ ...DEFAULT_SCENARIOS[0]!, id: 'scenario_0' }),
    [],
  );

  const go = (next: Step) => {
    void Haptics.selectionAsync();
    setStep(next);
  };

  const complete = async (plan: PlanTier) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await saveOnboarding({
      language,
      scenario: defaultScenario,
      proficiency,
      motivation,
      plan,
      completedAt: new Date().toISOString(),
    });
    await savePlan(plan);
    const profile = await getProfile();
    if (profile.displayName === 'You') {
      await saveProfile({ ...profile, displayName: 'Learner' });
    }
    router.replace('/home');
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.backgroundWarm, colors.backgroundDeep, colors.background]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 'welcome' && (
              <Animated.View entering={FadeInDown.duration(560)} style={styles.welcome}>
                <Animated.View entering={ZoomIn.delay(120).duration(520)}>
                  <NobiAvatar state="idle" size={168} />
                </Animated.View>
                <Text style={styles.brand}>Nobi</Text>
                <Text style={styles.headline}>Speak fluently with your AI language companion</Text>
                <Text style={styles.subhead}>
                  Real conversations, gentle corrections, and a streak that keeps you coming back.
                </Text>
                <Pressable style={styles.primaryButton} onPress={() => go('language')}>
                  <Text style={styles.primaryButtonText}>Get started</Text>
                </Pressable>
              </Animated.View>
            )}

            {step === 'language' && (
              <Animated.View entering={FadeInRight.duration(380)} exiting={FadeOutLeft.duration(220)}>
                <StepHeader
                  step={1}
                  title="Choose your language"
                  subtitle="You’ll practice speaking this every day."
                />
                <View style={styles.langGrid}>
                  {LANGUAGE_OPTIONS.map((opt) => {
                    const active = language === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.langCard, active && styles.langCardActive]}
                        onPress={() => {
                          void Haptics.selectionAsync();
                          setLanguage(opt.value);
                        }}
                      >
                        <Text style={styles.langFlag}>{opt.flag}</Text>
                        <Text style={[styles.langLabel, active && styles.langLabelActive]}>
                          {opt.label}
                        </Text>
                        <Text style={styles.langNative}>{opt.nativeLabel}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.row}>
                  <Pressable style={styles.secondaryButton} onPress={() => go('welcome')}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, styles.flexButton]}
                    onPress={() => go('goals')}
                  >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {step === 'goals' && (
              <Animated.View entering={FadeInRight.duration(380)} exiting={FadeOutLeft.duration(220)}>
                <StepHeader
                  step={2}
                  title="Your level & goal"
                  subtitle="We’ll tune scenarios and pace to match."
                />
                <Text style={styles.sectionLabel}>Proficiency</Text>
                <View style={styles.stack}>
                  {PROFICIENCY_OPTIONS.map((opt) => {
                    const active = proficiency === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.choiceRow, active && styles.choiceRowActive]}
                        onPress={() => setProficiency(opt.value)}
                      >
                        <View style={styles.flex}>
                          <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.choiceDesc}>{opt.description}</Text>
                        </View>
                        <View style={[styles.radio, active && styles.radioActive]} />
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Why are you learning?</Text>
                <View style={styles.stack}>
                  {MOTIVATION_OPTIONS.map((opt) => {
                    const active = motivation === opt.value;
                    return (
                      <Pressable
                        key={opt.value}
                        style={[styles.choiceRow, active && styles.choiceRowActive]}
                        onPress={() => setMotivation(opt.value)}
                      >
                        <Text style={styles.choiceIcon}>{opt.icon}</Text>
                        <View style={styles.flex}>
                          <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>
                            {opt.label}
                          </Text>
                          <Text style={styles.choiceDesc}>{opt.description}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <View style={styles.row}>
                  <Pressable style={styles.secondaryButton} onPress={() => go('language')}>
                    <Text style={styles.secondaryButtonText}>Back</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.primaryButton, styles.flexButton]}
                    onPress={() => go('account')}
                  >
                    <Text style={styles.primaryButtonText}>Continue</Text>
                  </Pressable>
                </View>
              </Animated.View>
            )}

            {step === 'account' && (
              <Animated.View entering={FadeInRight.duration(380)} exiting={FadeOutLeft.duration(220)}>
                <StepHeader
                  step={3}
                  title="Create your space"
                  subtitle="Sign in later — or jump in as a guest."
                />
                <View style={styles.accountHero}>
                  <NobiAvatar state="idle" size={96} />
                </View>

                <Pressable
                  style={styles.socialButton}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPaywallVisible(true);
                  }}
                >
                  <Text style={styles.socialEmoji}>A</Text>
                  <Text style={styles.socialText}>Continue with Apple</Text>
                </Pressable>
                <Pressable
                  style={styles.socialButton}
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setPaywallVisible(true);
                  }}
                >
                  <Text style={styles.socialEmoji}>G</Text>
                  <Text style={styles.socialText}>Continue with Google</Text>
                </Pressable>

                <Pressable
                  style={[styles.primaryButton, { marginTop: 8 }]}
                  onPress={() => setPaywallVisible(true)}
                >
                  <Text style={styles.primaryButtonText}>See plans</Text>
                </Pressable>

                <Pressable style={styles.guestLink} onPress={() => void complete('guest')}>
                  <Text style={styles.guestText}>Continue as guest</Text>
                </Pressable>

                <Pressable style={styles.backOnly} onPress={() => go('goals')}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <PaywallModal
        visible={paywallVisible}
        selected={selectedPlan}
        onSelect={setSelectedPlan}
        onClose={() => setPaywallVisible(false)}
        onConfirm={() => {
          setPaywallVisible(false);
          void complete(selectedPlan);
        }}
        onGuest={() => {
          setPaywallVisible(false);
          void complete('guest');
        }}
      />
    </View>
  );
}

function StepHeader({
  step,
  title,
  subtitle,
}: {
  step: number;
  title: string;
  subtitle: string;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.stepHeader}>
      <Text style={styles.stepMeta}>Step {step} of 3</Text>
      <Text style={styles.stepTitle}>{title}</Text>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

function PaywallModal({
  visible,
  selected,
  onSelect,
  onClose,
  onConfirm,
  onGuest,
}: {
  visible: boolean;
  selected: Exclude<PlanTier, 'guest'>;
  onSelect: (plan: Exclude<PlanTier, 'guest'>) => void;
  onClose: () => void;
  onConfirm: () => void;
  onGuest: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Unlock unlimited practice</Text>
          <Text style={styles.modalSubtitle}>Pick a plan — cancel anytime on Monthly & Yearly.</Text>

          {PLAN_OPTIONS.map((plan) => {
            const active = selected === plan.value;
            return (
              <Pressable
                key={plan.value}
                style={[styles.planCard, active && styles.planCardActive]}
                onPress={() => onSelect(plan.value)}
              >
                <View style={styles.planTop}>
                  <Text style={[styles.planLabel, active && styles.planLabelActive]}>
                    {plan.label}
                  </Text>
                  {plan.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.planPrice}>
                  {plan.price}
                  <Text style={styles.planPer}> {plan.per}</Text>
                </Text>
                {plan.highlights.map((h) => (
                  <Text key={h} style={styles.planHighlight}>
                    · {h}
                  </Text>
                ))}
              </Pressable>
            );
          })}

          <Pressable style={styles.primaryButton} onPress={onConfirm}>
            <Text style={styles.primaryButtonText}>Start with {selected}</Text>
          </Pressable>
          <Pressable style={styles.guestLink} onPress={onGuest}>
            <Text style={styles.guestText}>Maybe later — continue as guest</Text>
          </Pressable>
          <Pressable style={styles.backOnly} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    padding: 24,
    paddingBottom: 48,
    flexGrow: 1,
  },
  welcome: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    minHeight: 520,
  },
  brand: {
    ...typography.hero,
    color: colors.primaryDark,
    marginTop: 18,
  },
  headline: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  subhead: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  stepHeader: { marginBottom: 20 },
  stepMeta: {
    ...typography.tiny,
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  stepTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  langGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  langCard: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
  },
  langCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  langFlag: { fontSize: 28, marginBottom: 8 },
  langLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  langLabelActive: { color: colors.primaryDark },
  langNative: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 10,
  },
  stack: { gap: 10, marginBottom: 8 },
  choiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  choiceRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceIcon: { fontSize: 22 },
  choiceTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  choiceTitleActive: { color: colors.primaryDark },
  choiceDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  accountHero: {
    alignItems: 'center',
    marginBottom: 20,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginBottom: 10,
  },
  socialEmoji: {
    ...typography.subtitle,
    color: colors.text,
    width: 22,
    textAlign: 'center',
  },
  socialText: {
    ...typography.label,
    color: colors.text,
    fontSize: 15,
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  guestText: {
    ...typography.label,
    color: colors.primary,
  },
  backOnly: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  flexButton: { flex: 1 },
  primaryButtonText: {
    ...typography.label,
    color: '#fff',
    fontSize: 16,
  },
  secondaryButton: {
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.textMuted,
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
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 6,
  },
  modalSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 18,
  },
  planCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
    backgroundColor: colors.background,
  },
  planCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  planTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  planLabel: {
    ...typography.subtitle,
    color: colors.text,
  },
  planLabelActive: { color: colors.primaryDark },
  badge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: {
    ...typography.tiny,
    color: colors.accent,
    fontWeight: '700',
  },
  planPrice: {
    ...typography.title,
    color: colors.text,
    marginBottom: 6,
  },
  planPer: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '500',
  },
  planHighlight: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
