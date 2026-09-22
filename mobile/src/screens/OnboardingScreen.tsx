import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AgentVoiceHeader } from '../components/AgentVoiceHeader';
import { MascotGlow } from '../components/MascotGlow';
import { PrimaryButton } from '../components/PrimaryButton';
import { SocialSignInButtons } from '../components/SocialSignInButtons';
import { NobiAvatar } from '../components/NobiAvatar';
import { previewLanguageVoice } from '../services/languagePreview';
import { speakAgentLine, stopAgentSpeech, type SpeechController } from '../services/onboardingSpeech';
import {
  getProfile,
  resetFreeSessions,
  saveOnboarding,
  savePlan,
  saveProfile,
} from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  DEFAULT_SCENARIOS,
  FIRST_LESSON,
  LANGUAGE_OPTIONS,
  MOTIVATION_OPTIONS,
  PLAN_LOADING_CARDS,
  PROFICIENCY_OPTIONS,
  type OnboardingFlowState,
  type SupportedLanguage,
} from '../types';

const CARD_WIDTH = Dimensions.get('window').width - 48;

type Step =
  | 'splash'
  | 'language'
  | 'dialogue_name'
  | 'dialogue_proficiency'
  | 'dialogue_goal'
  | 'plan_building'
  | 'plan_reveal'
  | 'account';

const ENTER = FadeInUp.duration(320);
const FADE = FadeIn.duration(240);

function languageLabel(lang: SupportedLanguage): string {
  return LANGUAGE_OPTIONS.find((l) => l.value === lang)?.label ?? lang;
}

function welcomeGreeting(lang: SupportedLanguage): string {
  const hello: Record<SupportedLanguage, string> = {
    spanish: '¡Hola!',
    french: 'Bonjour !',
    english: 'Hi!',
    japanese: 'こんにちは！',
    german: 'Hallo!',
    russian: 'Привет!',
  };
  return `${hello[lang]} Welcome, I'm Nobi! Let's get started! What's your name?`;
}

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>('splash');
  const [flow, setFlow] = useState<OnboardingFlowState>({
    language: null,
    name: '',
    proficiency: null,
    motivation: null,
  });
  const [agentText, setAgentText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loadingText, setLoadingText] = useState('Building your plan…');
  const [loadingCardIdx, setLoadingCardIdx] = useState(0);
  const speechRef = useRef<SpeechController | null>(null);

  const go = useCallback((next: Step) => {
    void Haptics.selectionAsync();
    stopAgentSpeech();
    setStep(next);
  }, []);

  const playLine = useCallback(
    (text: string, lang: SupportedLanguage = flow.language ?? 'english') => {
      stopAgentSpeech();
      setAgentText(text);
      speechRef.current = speakAgentLine(text, lang, 1, undefined, undefined);
    },
    [flow.language],
  );

  useEffect(() => {
    if (!flow.language) return;

    if (step === 'dialogue_name') {
      playLine(welcomeGreeting(flow.language), flow.language);
    } else if (step === 'dialogue_proficiency' && flow.name) {
      playLine(
        `Nice to meet you, ${flow.name}! How much ${languageLabel(flow.language)} do you know?`,
      );
    } else if (step === 'dialogue_goal') {
      playLine(`What would you like to achieve with ${languageLabel(flow.language)}?`);
    }
    return () => stopAgentSpeech();
  }, [step, flow.name, flow.language, playLine]);

  useEffect(() => {
    if (step !== 'plan_building') return;

    const texts = [
      'Analyzing your answers…',
      'Picking your first scenarios…',
      "Tuning Nobi's voice for you…",
      'Almost ready!',
    ];
    let textIdx = 0;

    const textTimer = setInterval(() => {
      textIdx = (textIdx + 1) % texts.length;
      setLoadingText(texts[textIdx]!);
    }, 1100);

    const done = setTimeout(() => {
      setLoadingCardIdx(0);
      go('plan_reveal');
    }, 4500);

    return () => {
      clearInterval(textTimer);
      clearTimeout(done);
    };
  }, [step, go]);

  const complete = async (asGuest = true) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    stopAgentSpeech();

    if (!flow.language || !flow.proficiency || !flow.motivation) return;

    const firstScenario = {
      ...DEFAULT_SCENARIOS[FIRST_LESSON.scenarioIndex]!,
      id: 'lesson_0',
    };

    await saveOnboarding({
      language: flow.language,
      scenario: firstScenario,
      proficiency: flow.proficiency,
      motivation: flow.motivation,
      plan: 'guest',
      name: flow.name.trim() || undefined,
      completedAt: new Date().toISOString(),
    });
    await savePlan('guest');
    await resetFreeSessions();

    const profile = await getProfile();
    await saveProfile({
      ...profile,
      displayName: flow.name.trim() || 'Learner',
    });

    router.replace('/home');
  };

  const canContinueName = flow.name.trim().length >= 1;
  const canContinueLanguage = flow.language != null;

  const cardShadow = useMemo(
    () => ({
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    }),
    [],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {step !== 'splash' &&
            step !== 'plan_building' &&
            step !== 'plan_reveal' &&
            step !== 'account' && (
            <AgentVoiceHeader
              onClose={() => go('splash')}
              showHelp={step.startsWith('dialogue')}
            />
          )}

          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View>
              {step === 'splash' && (
                <Animated.View entering={ENTER} exiting={FadeOut.duration(180)} style={styles.splash}>
                  <NobiAvatar state="idle" size={160} />
                  <Text style={styles.brand}>Nobi</Text>
                  <Pressable
                    style={styles.splashNext}
                    onPress={() => go('language')}
                  >
                    <Ionicons name="chevron-forward" size={28} color="#fff" />
                  </Pressable>
                  <Pressable onPress={() => go('account')}>
                    <Text style={styles.splashLink}>Already have an account?</Text>
                  </Pressable>
                </Animated.View>
              )}

              {step === 'language' && (
                <Animated.View entering={ENTER} exiting={FadeOut.duration(180)}>
                  <Pressable style={styles.backCircle} onPress={() => go('splash')}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </Pressable>
                  <View style={styles.langHeader}>
                    <MascotGlow size={120} active={false}>
                      <NobiAvatar state="idle" size={112} softAura />
                    </MascotGlow>
                    <Text style={styles.langTitle}>Which language do you want to learn?</Text>
                  </View>
                  <View style={styles.langList}>
                    {LANGUAGE_OPTIONS.map((opt) => {
                      const active = flow.language === opt.value;
                      return (
                        <View key={opt.value}>
                          <Pressable
                            style={[styles.langPill, active && styles.langPillActive, cardShadow]}
                            onPress={() => {
                              void Haptics.selectionAsync();
                              setFlow((f) => ({ ...f, language: opt.value }));
                              previewLanguageVoice(opt.value);
                            }}
                          >
                            <Text style={styles.langFlag}>{opt.flag}</Text>
                            <Text style={[styles.langPillText, active && styles.langPillTextActive]}>
                              {opt.label}
                            </Text>
                          </Pressable>
                        </View>
                      );
                    })}
                  </View>
                  <Pressable
                    style={[
                      styles.primaryPill,
                      !canContinueLanguage && styles.disabled,
                      cardShadow,
                    ]}
                    disabled={!canContinueLanguage}
                    onPress={() => go('dialogue_name')}
                  >
                    <Text style={styles.primaryPillText}>Continue</Text>
                  </Pressable>
                </Animated.View>
              )}

              {(step === 'dialogue_name' ||
                step === 'dialogue_proficiency' ||
                step === 'dialogue_goal') && (
                <Animated.View entering={ENTER} exiting={FadeOut.duration(180)} style={styles.dialogue}>
                  <Text style={styles.agentLine}>{agentText}</Text>

                  {step === 'dialogue_name' && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.inputBlock}>
                      <TextInput
                        style={[styles.nameInput, cardShadow]}
                        placeholder="Your name"
                        placeholderTextColor={colors.textLight}
                        value={flow.name}
                        onChangeText={(name) => setFlow((f) => ({ ...f, name }))}
                        autoCapitalize="words"
                        returnKeyType="done"
                        onSubmitEditing={() => canContinueName && go('dialogue_proficiency')}
                      />
                      <Pressable
                        style={[
                          styles.micBtn,
                          isListening && styles.micBtnActive,
                          cardShadow,
                        ]}
                        onPressIn={() => setIsListening(true)}
                        onPressOut={() => setIsListening(false)}
                      >
                        <Ionicons
                          name={isListening ? 'mic' : 'mic-outline'}
                          size={22}
                          color={isListening ? '#fff' : colors.primary}
                        />
                        <Text style={[styles.micLabel, isListening && styles.micLabelActive]}>
                          {isListening ? 'Listening…' : 'Tap to speak'}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.primaryPill,
                          !canContinueName && styles.disabled,
                          cardShadow,
                        ]}
                        disabled={!canContinueName}
                        onPress={() => go('dialogue_proficiency')}
                      >
                        <Text style={styles.primaryPillText}>Continue</Text>
                      </Pressable>
                      <Text style={styles.legal}>
                        Nobi uses AI services to power conversations. By continuing, you agree to
                        our Terms & Privacy Policy.
                      </Text>
                    </Animated.View>
                  )}

                  {step === 'dialogue_proficiency' && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.choiceStack}>
                      {PROFICIENCY_OPTIONS.map((opt) => {
                        const active = flow.proficiency === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            style={[styles.choiceCard, active && styles.choiceCardActive, cardShadow]}
                            onPress={() => {
                              void Haptics.selectionAsync();
                              setFlow((f) => ({ ...f, proficiency: opt.value }));
                              setTimeout(() => go('dialogue_goal'), 280);
                            }}
                          >
                            <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>
                              {opt.label}
                            </Text>
                            <Text style={styles.choiceDesc}>{opt.description}</Text>
                          </Pressable>
                        );
                      })}
                    </Animated.View>
                  )}

                  {step === 'dialogue_goal' && (
                    <Animated.View entering={FadeIn.duration(300)} style={styles.choiceStack}>
                      {MOTIVATION_OPTIONS.map((opt) => {
                        const active = flow.motivation === opt.value;
                        return (
                          <Pressable
                            key={opt.value}
                            style={[styles.choiceCard, active && styles.choiceCardActive, cardShadow]}
                            onPress={() => {
                              void Haptics.selectionAsync();
                              setFlow((f) => ({ ...f, motivation: opt.value }));
                              setTimeout(() => go('plan_building'), 280);
                            }}
                          >
                            <Text style={styles.choiceIcon}>{opt.icon}</Text>
                            <Text style={[styles.choiceTitle, active && styles.choiceTitleActive]}>
                              {opt.label}
                            </Text>
                            <Text style={styles.choiceDesc}>{opt.description}</Text>
                          </Pressable>
                        );
                      })}
                    </Animated.View>
                  )}
                </Animated.View>
              )}

              {step === 'plan_building' && (
                <Animated.View entering={FADE} style={styles.buildingFull}>
                  <NobiAvatar state="thinking" size={120} softAura />
                  <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 32 }} />
                  <Animated.Text entering={FADE} key={loadingText} style={styles.buildingText}>
                    {loadingText}
                  </Animated.Text>
                </Animated.View>
              )}

              {step === 'plan_reveal' && (
                <Animated.View entering={ENTER} style={styles.planReveal}>
                  <MascotGlow size={120} active={false}>
                    <NobiAvatar state="idle" size={112} softAura />
                  </MascotGlow>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.cardCarousel}
                    contentContainerStyle={styles.cardCarouselContent}
                    onMomentumScrollEnd={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                      const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH);
                      setLoadingCardIdx(Math.max(0, Math.min(PLAN_LOADING_CARDS.length - 1, idx)));
                    }}
                  >
                    {PLAN_LOADING_CARDS.map((card, i) => (
                      <View key={card.title} style={[styles.planCard, { width: CARD_WIDTH }, cardShadow]}>
                        <View style={styles.planCardIconWrap}>
                          <Text style={styles.planCardIcon}>{card.icon}</Text>
                        </View>
                        <Text style={styles.planCardTitle}>
                          {i === 0
                            ? `Your ${languageLabel(flow.language ?? 'english')} starting point`
                            : card.title}
                        </Text>
                        <Text style={styles.planCardBody}>{card.body}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.dotsRow}>
                    {PLAN_LOADING_CARDS.map((_, i) => (
                      <Pressable key={i} onPress={() => setLoadingCardIdx(i)}>
                        <View style={[styles.pageDot, i === loadingCardIdx && styles.pageDotActive]} />
                      </Pressable>
                    ))}
                  </View>
                  <PrimaryButton title="Start learning" fullWidth onPress={() => go('account')} />
                </Animated.View>
              )}

              {step === 'account' && (
                <Animated.View entering={ENTER} exiting={FadeOut.duration(180)} style={styles.account}>
                  <Pressable style={styles.backCircle} onPress={() => go('plan_reveal')}>
                    <Ionicons name="chevron-back" size={20} color={colors.text} />
                  </Pressable>
                  <View style={styles.accountHeader}>
                    <NobiAvatar state="idle" size={64} softAura />
                    <Text style={styles.accountTitle}>Create an account</Text>
                  </View>

                  <SocialSignInButtons
                    onApple={() => void complete(true)}
                    onGoogle={() => void complete(true)}
                  />

                  <Pressable style={styles.guestLink} onPress={() => void complete(true)}>
                    <Text style={styles.guestText}>Continue as guest</Text>
                  </Pressable>
                </Animated.View>
              )}
            </Animated.View>
          </ScrollView>

        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundWarm },
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  splash: {
    flexGrow: 1,
    minHeight: 520,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 48,
  },
  brand: {
    ...typography.hero,
    color: colors.primaryDark,
    marginTop: 8,
  },
  splashNext: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 6,
  },
  splashLink: {
    ...typography.label,
    color: colors.text,
    fontSize: 16,
  },
  backCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  langHeader: {
    alignItems: 'center',
    gap: 24,
    marginBottom: 28,
    paddingTop: 8,
  },
  langTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 38,
  },
  langList: { gap: 10, marginBottom: 24 },
  langPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  langPillActive: {
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  langFlag: { fontSize: 22 },
  langPillText: {
    ...typography.subtitle,
    color: colors.text,
  },
  langPillTextActive: { color: colors.primaryDark },
  primaryPill: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    minHeight: 56,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 8,
  },
  primaryPillText: {
    ...typography.label,
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
  disabled: { opacity: 0.45 },
  dialogue: {
    flexGrow: 1,
    paddingTop: 32,
    minHeight: 400,
  },
  agentLine: {
    ...typography.display,
    color: colors.text,
    lineHeight: 40,
    marginBottom: 32,
  },
  inputBlock: { gap: 14 },
  nameInput: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 18,
    ...typography.body,
    color: colors.text,
    fontSize: 18,
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  micBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  micLabel: {
    ...typography.label,
    color: colors.primary,
  },
  micLabelActive: { color: '#fff' },
  legal: {
    ...typography.tiny,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 8,
  },
  choiceStack: { gap: 12 },
  choiceCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  choiceCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  choiceIcon: { fontSize: 24, marginBottom: 6 },
  choiceTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: 4,
  },
  choiceTitleActive: { color: colors.primaryDark },
  choiceDesc: {
    ...typography.caption,
    color: colors.textMuted,
  },
  buildingFull: {
    flexGrow: 1,
    minHeight: 560,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  buildingText: {
    ...typography.subtitle,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 20,
  },
  planReveal: {
    flexGrow: 1,
    minHeight: 520,
    alignItems: 'center',
    paddingTop: 16,
    gap: 20,
    width: '100%',
  },
  cardCarousel: {
    width: CARD_WIDTH,
  },
  cardCarouselContent: {
    alignItems: 'center',
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  planCardIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  planCardIcon: {
    fontSize: 28,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  planCardTitle: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '700',
  },
  planCardBody: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  pageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  pageDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 12,
  },
  account: {
    flexGrow: 1,
    minHeight: 480,
    paddingTop: 8,
  },
  accountHeader: {
    alignItems: 'center',
    gap: 24,
    marginBottom: 36,
    marginTop: 12,
  },
  accountTitle: {
    ...typography.display,
    color: colors.text,
    textAlign: 'center',
  },
  guestLink: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  guestText: {
    ...typography.label,
    color: colors.primary,
    fontSize: 15,
  },
});
