import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { LANGUAGE_OPTIONS, type OnboardingData, type ProficiencyLevel } from '../types';

function levelLabel(proficiency: ProficiencyLevel): string {
  if (proficiency === 'beginner') return 'Level 1';
  if (proficiency === 'intermediate') return 'Level 2';
  return 'Level 3';
}

interface LanguageLearningOverlayProps {
  visible: boolean;
  onboarding: OnboardingData;
  onClose: () => void;
  onSelectLanguage: (lang: OnboardingData['language']) => void;
}

export function LanguageLearningOverlay({
  visible,
  onboarding,
  onClose,
  onSelectLanguage,
}: LanguageLearningOverlayProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.safe}>
          <Animated.View entering={SlideInDown.springify().damping(18)} style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Learning</Text>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {LANGUAGE_OPTIONS.map((opt) => {
                const active = onboarding.language === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.langCard, active && styles.langCardActive]}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      onSelectLanguage(opt.value);
                    }}
                  >
                    <Text style={styles.flag}>{opt.flag}</Text>
                    <View style={styles.langBody}>
                      <Text style={[styles.langName, active && styles.langNameActive]}>
                        {opt.label}
                      </Text>
                      {active && (
                        <Text style={styles.level}>{levelLabel(onboarding.proficiency)}</Text>
                      )}
                    </View>
                    {active && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            <Animated.Text entering={FadeIn.delay(200)} style={styles.hint}>
              Update your level in My plan below.
            </Animated.Text>

            <Pressable
              style={styles.settingsBtn}
              onPress={() => {
                onClose();
                router.push('/settings');
              }}
            >
              <Text style={styles.settingsText}>Settings</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  safe: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    flex: 1,
    marginTop: 48,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { flex: 1 },
  listContent: { gap: 10, paddingBottom: 12 },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  langCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  flag: { fontSize: 28 },
  langBody: { flex: 1 },
  langName: {
    ...typography.subtitle,
    color: colors.text,
  },
  langNameActive: { color: colors.primaryDark },
  level: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  hint: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    marginVertical: 12,
  },
  settingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  settingsText: {
    ...typography.subtitle,
    color: colors.text,
  },
});
