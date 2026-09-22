import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { NobiAvatar } from './NobiAvatar';

interface AgentVoiceHeaderProps {
  onHelp?: () => void;
  onClose?: () => void;
  showHelp?: boolean;
  showClose?: boolean;
}

export function AgentVoiceHeader({
  onHelp,
  onClose,
  showHelp = true,
  showClose = true,
}: AgentVoiceHeaderProps) {
  return (
    <View style={styles.row}>
      {showHelp ? (
        <Pressable style={styles.iconBtn} onPress={onHelp} hitSlop={12}>
          <Text style={styles.iconText}>?</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}

      <NobiAvatar state="idle" size={40} softAura />

      {showClose ? (
        <Pressable style={styles.iconBtn} onPress={onClose} hitSlop={12}>
          <Text style={styles.iconText}>✕</Text>
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
    </View>
  );
}

interface AgentAvatarPulseProps {
  isPlaying: boolean;
  size?: number;
}

export function AgentAvatarPulse({ isPlaying, size = 72 }: AgentAvatarPulseProps) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      scale.value = withRepeat(
        withSequence(withTiming(1.06, { duration: 420 }), withTiming(1, { duration: 420 })),
        -1,
        false,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isPlaying, scale]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.avatarWrap, pulseStyle]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <NobiAvatar state={isPlaying ? 'speaking' : 'idle'} size={size * 0.85} softAura />
      </View>
    </Animated.View>
  );
}

interface OnboardingAudioBarProps {
  isPlaying: boolean;
  progress: number;
  speed: number;
  onTogglePlay: () => void;
  onCycleSpeed: () => void;
  statusText?: string;
}

export function OnboardingAudioBar({
  isPlaying,
  progress,
  speed,
  onTogglePlay,
  onCycleSpeed,
  statusText,
}: OnboardingAudioBarProps) {
  return (
    <View style={styles.audioBar}>
      <Pressable style={styles.audioBtn} onPress={onTogglePlay} hitSlop={8}>
        <Text style={styles.audioBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
      </Pressable>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
      </View>

      <Pressable style={styles.speedBtn} onPress={onCycleSpeed} hitSlop={8}>
        <Text style={styles.speedText}>{speed.toFixed(1)}x</Text>
      </Pressable>

      {statusText ? <Text style={styles.listeningText}>{statusText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    ...typography.label,
    color: colors.textMuted,
    fontSize: 16,
  },
  spacer: { width: 40 },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  audioBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  audioBtn: {
    position: 'absolute',
    left: 20,
    bottom: 14,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioBtnText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.border,
    borderRadius: 2,
    marginHorizontal: 36,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  speedBtn: {
    position: 'absolute',
    right: 20,
    bottom: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  speedText: {
    ...typography.tiny,
    color: colors.textMuted,
    fontWeight: '600',
  },
  listeningText: {
    ...typography.tiny,
    color: colors.primary,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '600',
  },
});
