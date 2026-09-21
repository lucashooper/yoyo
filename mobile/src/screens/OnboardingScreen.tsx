import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NobiAvatar } from '../components/NobiAvatar';
import { saveOnboarding } from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  DEFAULT_SCENARIOS,
  LANGUAGE_OPTIONS,
  type Scenario,
  type SupportedLanguage,
} from '../types';

type Step = 'language' | 'scenario' | 'custom';

export function OnboardingScreen() {
  const [step, setStep] = useState<Step>('language');
  const [language, setLanguage] = useState<SupportedLanguage>('spanish');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');

  const scenarios = useMemo(
    () =>
      DEFAULT_SCENARIOS.map((s, i) => ({
        ...s,
        id: `scenario_${i}`,
      })),
    [],
  );

  const finish = async (scenario: Scenario) => {
    await saveOnboarding({
      language,
      scenario,
      completedAt: new Date().toISOString(),
    });
    router.replace('/session');
  };

  const handleCustomFinish = () => {
    if (!customTitle.trim() || !customPrompt.trim()) return;
    void finish({
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      prompt: customPrompt.trim(),
      isCustom: true,
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(500)} style={styles.hero}>
            <NobiAvatar state="idle" size={140} />
            <Text style={styles.brand}>Nobi</Text>
            <Text style={styles.tagline}>Drop in. Start speaking.</Text>
          </Animated.View>

          {step === 'language' && (
            <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(250)}>
              <Text style={styles.stepTitle}>What language?</Text>
              <View style={styles.options}>
                {LANGUAGE_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, language === opt.value && styles.chipActive]}
                    onPress={() => setLanguage(opt.value)}
                  >
                    <Text style={styles.chipEmoji}>{opt.flag}</Text>
                    <Text
                      style={[styles.chipText, language === opt.value && styles.chipTextActive]}
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Pressable style={styles.primaryButton} onPress={() => setStep('scenario')}>
                <Text style={styles.primaryButtonText}>Continue</Text>
              </Pressable>
            </Animated.View>
          )}

          {step === 'scenario' && (
            <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(250)}>
              <Text style={styles.stepTitle}>Pick a scenario</Text>
              {scenarios.map((scenario) => (
                <Pressable
                  key={scenario.id}
                  style={[
                    styles.scenarioCard,
                    selectedScenario?.id === scenario.id && styles.scenarioCardActive,
                  ]}
                  onPress={() => setSelectedScenario(scenario)}
                >
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <Text style={styles.scenarioPrompt}>{scenario.prompt}</Text>
                </Pressable>
              ))}
              <Pressable style={styles.linkButton} onPress={() => setStep('custom')}>
                <Text style={styles.linkText}>+ Create custom scenario</Text>
              </Pressable>
              <View style={styles.row}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep('language')}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.primaryButton, styles.flexButton, !selectedScenario && styles.disabled]}
                  disabled={!selectedScenario}
                  onPress={() => selectedScenario && void finish(selectedScenario)}
                >
                  <Text style={styles.primaryButtonText}>Start learning</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}

          {step === 'custom' && (
            <Animated.View entering={FadeInRight.duration(400)} exiting={FadeOutLeft.duration(250)}>
              <Text style={styles.stepTitle}>Your scenario</Text>
              <TextInput
                style={styles.input}
                placeholder="Scenario title"
                placeholderTextColor={colors.textLight}
                value={customTitle}
                onChangeText={setCustomTitle}
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the roleplay (e.g. ordering at a bakery in Paris)"
                placeholderTextColor={colors.textLight}
                value={customPrompt}
                onChangeText={setCustomPrompt}
                multiline
              />
              <View style={styles.row}>
                <Pressable style={styles.secondaryButton} onPress={() => setStep('scenario')}>
                  <Text style={styles.secondaryButtonText}>Back</Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.primaryButton,
                    styles.flexButton,
                    (!customTitle.trim() || !customPrompt.trim()) && styles.disabled,
                  ]}
                  disabled={!customTitle.trim() || !customPrompt.trim()}
                  onPress={handleCustomFinish}
                >
                  <Text style={styles.primaryButtonText}>Save & continue</Text>
                </Pressable>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.backgroundWarm },
  flex: { flex: 1 },
  container: {
    padding: 24,
    paddingBottom: 48,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  brand: {
    ...typography.hero,
    color: colors.text,
    marginTop: 12,
  },
  tagline: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 4,
  },
  stepTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: 16,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '22',
  },
  chipEmoji: { fontSize: 18 },
  chipText: {
    ...typography.label,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.primary,
  },
  scenarioCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  scenarioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight + '18',
  },
  scenarioTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: 4,
  },
  scenarioPrompt: {
    ...typography.caption,
    color: colors.textMuted,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  linkText: {
    ...typography.label,
    color: colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
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
    marginTop: 8,
  },
  secondaryButtonText: {
    ...typography.label,
    color: colors.textMuted,
  },
  disabled: { opacity: 0.45 },
  input: {
    backgroundColor: colors.surface,
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
});
