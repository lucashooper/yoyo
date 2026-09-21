import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface Props {
  visible: boolean;
  message: string | null;
  onDismiss?: () => void;
}

/** Lightweight toast for API / network errors — auto-hides */
export function ErrorToast({ visible, message, onDismiss }: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible || !message) return;
    progress.value = withTiming(1, { duration: 200 });
    const timer = setTimeout(() => {
      progress.value = withTiming(0, { duration: 250 });
      onDismiss?.();
    }, 4200);
    return () => clearTimeout(timer);
  }, [visible, message, onDismiss, progress]);

  if (!visible || !message) return null;

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(200)} style={styles.wrap}>
      <View style={styles.toast}>
        <Text style={styles.text}>{message}</Text>
      </View>
    </Animated.View>
  );
}

export function ConnectionBanner({
  visible,
  onReconnect,
}: {
  visible: boolean;
  onReconnect: () => void;
}) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!visible) return;
    pulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.sin) }),
      ),
      -1,
      false,
    );
  }, [visible, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.85 + pulse.value * 0.15,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, style]}>
      <Text style={styles.bannerText}>Connection lost</Text>
      <Text style={styles.bannerAction} onPress={onReconnect}>
        Tap to reconnect
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 120,
    zIndex: 50,
  },
  toast: {
    backgroundColor: colors.errorSoft,
    borderWidth: 1,
    borderColor: colors.error + '55',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  text: {
    ...typography.caption,
    color: colors.error,
    textAlign: 'center',
  },
  banner: {
    marginHorizontal: 20,
    marginBottom: 8,
    backgroundColor: colors.errorSoft,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
  },
  bannerText: {
    ...typography.label,
    color: colors.error,
  },
  bannerAction: {
    ...typography.caption,
    color: colors.primaryDark,
    textDecorationLine: 'underline',
  },
});
