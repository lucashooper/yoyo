import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { GrammarCorrection } from '../types';

interface GrammarCorrectionCardProps {
  correction: GrammarCorrection | null;
  onDismiss: () => void;
}

export function GrammarCorrectionCard({ correction, onDismiss }: GrammarCorrectionCardProps) {
  const translateY = useSharedValue(120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (correction) {
      translateY.value = withSpring(0, { damping: 16, stiffness: 140 });
      opacity.value = withTiming(1, { duration: 250 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(120, { duration: 300 }, () => runOnJS(onDismiss)());
        opacity.value = withTiming(0, { duration: 300 });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [correction, onDismiss, opacity, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!correction) return null;

  return (
    <Animated.View style={[styles.card, style]}>
      <Pressable onPress={onDismiss}>
        <Text style={styles.title}>💡 Did you mean:</Text>
        <Text style={styles.suggestion}>"{correction.suggestion}"</Text>
        {correction.explanation && (
          <Text style={styles.explanation}>{correction.explanation}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 140,
    backgroundColor: colors.correction,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.correctionBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    ...typography.label,
    color: colors.text,
    marginBottom: 4,
  },
  suggestion: {
    ...typography.subtitle,
    color: colors.primary,
    fontSize: 17,
  },
  explanation: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 6,
  },
});
