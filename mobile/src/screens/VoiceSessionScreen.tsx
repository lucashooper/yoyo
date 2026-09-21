import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioWaveBar } from '../components/AudioWaveBar';
import { ConnectionBanner, ErrorToast } from '../components/ErrorToast';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { GrammarCorrectionCard } from '../components/GrammarCorrectionCard';
import { HelpModal } from '../components/HelpModal';
import { NobiAvatar } from '../components/NobiAvatar';
import { TranscriptDrawer } from '../components/TranscriptDrawer';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { logger } from '../services/logger';
import { logSession, signInAnonymously } from '../services/supabase';
import { getOnboarding, updateStreakAfterSession } from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { OnboardingData } from '../types';

function VoiceSessionInner({ onboarding }: { onboarding: OnboardingData }) {
  const [helpVisible, setHelpVisible] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);
  const [toastVisible, setToastVisible] = useState(false);

  const {
    state,
    amplitude,
    transcript,
    correction,
    error,
    statusText,
    stop,
    reconnect,
    dismissCorrection,
    dismissError,
  } = useVoiceSession({
    language: onboarding.language,
    scenarioPrompt: onboarding.scenario.prompt,
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

  const waveActive =
    state === 'listening' || state === 'user_speaking' || state === 'speaking';
  const languageLabel =
    onboarding.language.charAt(0).toUpperCase() + onboarding.language.slice(1);
  const scenarioEmoji =
    onboarding.scenario.icon ??
    (onboarding.scenario.title.toLowerCase().includes('coffee') ? '☕' : '💬');

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.backgroundWarm, colors.background, colors.backgroundDeep]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.container}>
          <View style={styles.headerOverlay} pointerEvents="box-none">
            <Pressable
              style={styles.iconButton}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setHelpVisible(true);
              }}
              hitSlop={16}
            >
              <Text style={styles.iconText}>?</Text>
            </Pressable>

            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {scenarioEmoji} {onboarding.scenario.title} · {languageLabel}
              </Text>
            </View>

            <Pressable
              style={styles.iconButton}
              onPress={() => void handleExit()}
              hitSlop={16}
            >
              <Text style={styles.iconText}>✕</Text>
            </Pressable>
          </View>

          <View style={styles.center}>
            <NobiAvatar state={state} amplitude={amplitude} size={260} />
          </View>

          <View style={styles.bottom}>
            <ConnectionBanner
              visible={state === 'error'}
              message={error}
              onReconnect={handleReconnect}
            />
            <GrammarCorrectionCard correction={correction} onDismiss={dismissCorrection} />
            <AudioWaveBar amplitude={amplitude} active={waveActive} />
            <Pressable
              onPress={state === 'error' ? handleReconnect : undefined}
              disabled={state !== 'error'}
            >
              <Text style={[styles.status, state === 'error' && styles.statusError]}>
                {statusText}
              </Text>
            </Pressable>
            <TranscriptDrawer entries={transcript} />
          </View>
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
    </View>
  );
}

export function VoiceSessionScreen() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [boundaryKey, setBoundaryKey] = useState(0);

  useEffect(() => {
    void getOnboarding().then((data) => {
      if (!data) {
        router.replace('/onboarding');
        return;
      }
      setOnboarding(data);
    });
  }, []);

  if (!onboarding) {
    return <View style={styles.loading} />;
  }

  return (
    <ErrorBoundary
      key={boundaryKey}
      scope="VoiceSessionScreen"
      fallbackTitle="Connection lost"
      onReset={() => setBoundaryKey((k) => k + 1)}
    >
      <VoiceSessionInner onboarding={onboarding} />
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface + 'CC',
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconText: {
    fontSize: 16,
    color: colors.textMuted,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.surface + 'EE',
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: '62%',
  },
  badgeText: {
    ...typography.tiny,
    color: colors.textMuted,
    letterSpacing: 0.2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    paddingBottom: 0,
  },
  status: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 20,
    letterSpacing: 0.2,
  },
  statusError: {
    color: colors.error,
    textDecorationLine: 'underline',
  },
});
