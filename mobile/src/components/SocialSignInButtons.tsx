import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface SocialSignInButtonsProps {
  onApple: () => void;
  onGoogle: () => void;
}

export function SocialSignInButtons({ onApple, onGoogle }: SocialSignInButtonsProps) {
  return (
    <View style={styles.stack}>
      <Pressable
        style={styles.appleBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onApple();
        }}
      >
        <Ionicons name="logo-apple" size={22} color="#fff" style={styles.icon} />
        <Text style={styles.appleText}>Sign in with Apple</Text>
      </Pressable>

      <Pressable
        style={styles.googleBtn}
        onPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onGoogle();
        }}
      >
        <Ionicons name="logo-google" size={20} color="#4285F4" style={styles.icon} />
        <Text style={styles.googleText}>Sign in with Google</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  appleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  icon: { marginRight: 10 },
  appleText: {
    ...typography.label,
    color: '#fff',
    fontSize: 16,
  },
  googleText: {
    ...typography.label,
    color: colors.text,
    fontSize: 16,
  },
});
