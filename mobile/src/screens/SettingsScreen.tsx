import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { clearOnboarding } from '../services/storage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

type SettingsItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  detail?: string;
  destructive?: boolean;
  onPress: () => void;
};

export function SettingsScreen() {
  const items: SettingsItem[] = [
    {
      id: 'account',
      label: 'Account',
      icon: 'person-circle-outline',
      onPress: () => Alert.alert('Account', 'Sign-in coming soon.'),
    },
    {
      id: 'pro',
      label: 'Upgrade to Pro',
      icon: 'sparkles-outline',
      onPress: () => Alert.alert('Pro', 'Unlimited sessions and priority voices.'),
    },
    {
      id: 'app-lang',
      label: 'App language',
      icon: 'language-outline',
      detail: 'English',
      onPress: () => Alert.alert('App language', 'Interface language settings coming soon.'),
    },
    {
      id: 'prefs',
      label: 'Preferences',
      icon: 'options-outline',
      onPress: () => Alert.alert('Preferences', 'Voice speed, haptics, and more.'),
    },
    {
      id: 'notif',
      label: 'Notifications',
      icon: 'notifications-outline',
      onPress: () => Alert.alert('Notifications', 'Daily practice reminders coming soon.'),
    },
    {
      id: 'about',
      label: 'About',
      icon: 'information-circle-outline',
      onPress: () => Alert.alert('Nobi', 'Version 1.0.0\nYour AI language companion.'),
    },
    {
      id: 'support',
      label: 'Contact support',
      icon: 'mail-outline',
      onPress: () => Alert.alert('Support', 'Email hello@nobi.app'),
    },
    {
      id: 'signout',
      label: 'Sign out',
      icon: 'log-out-outline',
      onPress: () => {
        Alert.alert('Sign out', 'Clear local session?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign out',
            onPress: () => void clearOnboarding().then(() => router.replace('/onboarding')),
          },
        ]);
      },
    },
    {
      id: 'delete',
      label: 'Delete account',
      icon: 'trash-outline',
      destructive: true,
      onPress: () => {
        Alert.alert('Delete account', 'This removes all local data permanently.', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => void clearOnboarding().then(() => router.replace('/onboarding')),
          },
        ]);
      },
    },
  ];

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <Pressable key={item.id} style={styles.row} onPress={item.onPress}>
              <Ionicons
                name={item.icon}
                size={22}
                color={item.destructive ? colors.error : colors.textMuted}
                style={styles.rowIcon}
              />
              <Text style={[styles.rowLabel, item.destructive && styles.destructive]}>
                {item.label}
              </Text>
              {item.detail ? <Text style={styles.rowDetail}>{item.detail}</Text> : null}
              {!item.destructive && (
                <Ionicons name="chevron-forward" size={18} color={colors.textLight} />
              )}
            </Pressable>
          ))}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundWarm },
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    ...typography.title,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { width: 40 },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 24,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  rowIcon: { marginRight: 14 },
  rowLabel: {
    ...typography.subtitle,
    color: colors.text,
    flex: 1,
  },
  rowDetail: {
    ...typography.caption,
    color: colors.textMuted,
    marginRight: 6,
  },
  destructive: { color: colors.error },
});
