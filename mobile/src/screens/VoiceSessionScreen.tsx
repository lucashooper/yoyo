import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AudioWaveBar } from '../components/AudioWaveBar';
import { GrammarCorrectionCard } from '../components/GrammarCorrectionCard';
import { HelpModal } from '../components/HelpModal';
import { NobiAvatar } from '../components/NobiAvatar';
import { TranscriptDrawer } from '../components/TranscriptDrawer';
import { useVoiceSession } from '../hooks/useVoiceSession';
import { logSession, signInAnonymously } from '../services/supabase';
import { getOnboarding } from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { OnboardingData } from '../types';

export function VoiceSessionScreen() {
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [sessionId] = useState(() => `session_${Date.now()}`);

  useEffect(() => {
    void getOnboarding().then((data) => {
      if (!data) {
        router.replace('/onboarding');
        return;
      }
      setOnboarding(data);
    });
  }, []);

  const {
    state,
    amplitude,
    transcript,
    correction,
    statusText,
    stop,
    dismissCorrection,
  } = useVoiceSession({
    language: onboarding?.language ?? 'spanish',
    scenarioPrompt: onboarding?.scenario.prompt ?? '',
    autoStart: !!onboarding,
  });

  const handleExit = useCallback(async () => {
    await stop();

    if (onboarding) {
      const { userId } = await signInAnonymously();
      await logSession(
        {
          id: sessionId,
          startedAt: new Date(parseInt(sessionId.split('_')[1] ?? `${Date.now()}`, 10)).toISOString(),
          endedAt: new Date().toISOString(),
          language: onboarding.language,
          scenarioTitle: onboarding.scenario.title,
          transcriptLength: transcript.length,
        },
        userId,
      );
    }

    router.back();
  }, [onboarding, sessionId, stop, transcript.length]);

  if (!onboarding) {
    return <View style={styles.loading} />;
  }

  const waveActive = state === 'listening' || state === 'user_speaking' || state === 'speaking';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable style={styles.iconButton} onPress={() => setHelpVisible(true)} hitSlop={12}>
            <Text style={styles.iconText}>?</Text>
          </Pressable>
          <Pressable style={styles.iconButton} onPress={() => void handleExit()} hitSlop={12}>
            <Text style={styles.iconText}>✕</Text>
          </Pressable>
        </View>

        <View style={styles.center}>
          <NobiAvatar state={state} amplitude={amplitude} size={240} />
        </View>

        <View style={styles.bottom}>
          <GrammarCorrectionCard correction={correction} onDismiss={dismissCorrection} />
          <AudioWaveBar amplitude={amplitude} active={waveActive} />
          <Text style={styles.status}>{statusText}</Text>
          <TranscriptDrawer entries={transcript} />
        </View>
      </View>

      <HelpModal visible={helpVisible} onClose={() => setHelpVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
    color: colors.textMuted,
    fontWeight: '500',
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
    color: colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
    minHeight: 20,
  },
});
