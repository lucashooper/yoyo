import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomScenarioModal } from '../components/CustomScenarioModal';
import { ConnectionBanner, ErrorToast } from '../components/ErrorToast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GrammarCorrectionCard } from '../components/GrammarCorrectionCard';
import { HelpModal } from '../components/HelpModal';
import { AudioWaveBar } from '../components/AudioWaveBar';
import { NobiAvatar } from '../components/NobiAvatar';
import { TranscriptDrawer } from '../components/TranscriptDrawer';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { logger } from '../services/logger';
import { logSession, signInAnonymously } from '../services/supabase';
import {
  consumeFreeSession,
  getFreeSessionsRemaining,
  getOnboarding,
  saveCustomScenario,
  saveOnboarding,
  updateStreakAfterSession,
} from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { OnboardingData, Scenario } from '../types';

function VoiceSessionInner({
  onboarding,
  scenarioPrompt,
  onScenarioChange,
}: {
  onboarding: OnboardingData;
  scenarioPrompt: string;
  onScenarioChange: (scenario: Scenario) => void;
}) {
  const [helpVisible, setHelpVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [toastVisible, setToastVisible] = useState(false);
  const {
    state,
    amplitude,
    transcript,
    correction,
    error,
    stop,
    reconnect,
    dismissCorrection,
    dismissError,
  } = useVoiceSession({
    language: onboarding.language,
    scenarioPrompt,
    autoStart: true,
  });

  useEffect(() => {
    if (error) {
      setToastVisible(true);
      logger.warn('VoiceSessionScreen', 'Session error surfaced', error);
    }
  }, [error]);

  const handleExit = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await stop();

    try {
      await consumeFreeSession();
      const { userId } = await signInAnonymously();
      await logSession(
        {
          id: sessionId,
          startedAt: new Date(
            parseInt(sessionId.split('_')[1] ?? `${Date.now()}`, 10),
          ).toISOString(),
          endedAt: new Date().toISOString(),
          language: onboarding.language,
          scenarioTitle: onboarding.scenario.title,
          transcriptLength: transcript.length,
        },
        userId,
      );
      await updateStreakAfterSession(25 + Math.min(50, transcript.length * 5));
    } catch (err) {
      logger.warn('VoiceSessionScreen', 'Failed to log session', err);
      await updateStreakAfterSession();
    }

    router.replace('/home');
  }, [onboarding, sessionId, stop, transcript.length]);

  const handleReconnect = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dismissError();
    setToastVisible(false);
    void reconnect();
  }, [dismissError, reconnect]);

  const handleCustomScenario = useCallback(
    async (text: string) => {
      setCustomModalVisible(false);
      setMenuVisible(false);

      const scenario: Scenario = {
        id: `custom_${Date.now()}`,
        title: text.length > 36 ? `${text.slice(0, 36)}…` : text,
        prompt: `Roleplay scenario: ${text}. Stay in character, adapt naturally, and keep responses conversational for language practice.`,
        isCustom: true,
        icon: '🎭',
      };

      await saveCustomScenario(scenario);
      await saveOnboarding({ ...onboarding, scenario });
      onScenarioChange(scenario);
      logger.info('VoiceSession', 'Custom roleplay applied', { title: scenario.title });
    },
    [onboarding, onScenarioChange],
  );

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            style={styles.iconBtn}
            onPress={() => setMenuVisible((v) => !v)}
            hitSlop={16}
          >
            <Text style={styles.menuIcon}>⋮⋮</Text>
          </Pressable>

          <Pressable style={styles.iconBtn} onPress={() => void handleExit()} hitSlop={16}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
        </View>

        {menuVisible && (
          <Animated.View entering={FadeInUp.duration(220)} style={styles.menuSheet}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setCustomModalVisible(true);
              }}
            >
              <Text style={styles.menuItemText}>Custom roleplay</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuVisible(false);
                setHelpVisible(true);
              }}
            >
              <Text style={styles.menuItemText}>How Nobi works</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                void getFreeSessionsRemaining().then((n) => {
                  logger.info('VoiceSession', `${n} free sessions remaining`);
                });
                setMenuVisible(false);
              }}
            >
              <Text style={styles.menuItemText}>Free sessions left</Text>
            </Pressable>
          </Animated.View>
        )}

        <View style={styles.center}>
          <NobiAvatar state={state} amplitude={amplitude} size={200} softAura />
        </View>

        <View style={styles.footer}>
          <ConnectionBanner
            visible={state === 'error'}
            message={error}
            onReconnect={handleReconnect}
          />
          <GrammarCorrectionCard correction={correction} onDismiss={dismissCorrection} />
          <AudioWaveBar
            amplitude={amplitude}
            active={
              state === 'listening' ||
              state === 'user_speaking' ||
              state === 'speaking'
            }
          />
          <TranscriptDrawer entries={transcript} minimal />
        </View>
      </SafeAreaView>

      <ErrorToast
        visible={toastVisible && !!error && state !== 'error'}
        message={error}
        onDismiss={() => {
          setToastVisible(false);
          dismissError();
        }}
      />
      <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
      <CustomScenarioModal
        visible={customModalVisible}
        onClose={() => setCustomModalVisible(false)}
        onSave={(text) => void handleCustomScenario(text)}
      />
    </View>
  );
}

export function VoiceSessionScreen() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [scenarioPrompt, setScenarioPrompt] = useState<string | null>(null);
  const [boundaryKey, setBoundaryKey] = useState(0);

  useEffect(() => {
    void getOnboarding().then((data) => {
      if (!data) {
        router.replace('/onboarding');
        return;
      }
      setOnboarding(data);
      setScenarioPrompt(data.scenario.prompt);
    });
  }, []);

  if (!onboarding || !scenarioPrompt) {
    return <View style={styles.loading} />;
  }

  return (
    <ErrorBoundary
      key={boundaryKey}
      scope="VoiceSessionScreen"
      fallbackTitle="Connection lost"
      onReset={() => setBoundaryKey((k) => k + 1)}
    >
      <VoiceSessionInner
        key={scenarioPrompt}
        onboarding={onboarding}
        scenarioPrompt={scenarioPrompt}
        onScenarioChange={(scenario) => {
          setOnboarding((prev) => (prev ? { ...prev, scenario } : prev));
          setScenarioPrompt(scenario.prompt);
          setBoundaryKey((k) => k + 1);
        }}
      />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  safe: { flex: 1 },
  loading: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  menuIcon: {
    ...typography.label,
    color: colors.textMuted,
    letterSpacing: -2,
    fontSize: 14,
  },
  iconText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
  },
  menuSheet: {
    position: 'absolute',
    top: 64,
    left: 20,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 8,
    minWidth: 180,
    zIndex: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    ...typography.label,
    color: colors.text,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingBottom: 0,
  },
});
