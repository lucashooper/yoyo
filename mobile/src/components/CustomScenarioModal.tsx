import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface CustomScenarioModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (scenarioText: string) => void;
}

export function CustomScenarioModal({ visible, onClose, onSave }: CustomScenarioModalProps) {
  const [text, setText] = useState('');

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave(trimmed);
    setText('');
  };

  const handleClose = () => {
    setText('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropTap} onPress={handleClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Custom roleplay</Text>
          <Text style={styles.subtitle}>
            Describe who Nobi should be — e.g. &quot;my girlfriend&quot;, &quot;a strict teacher&quot;,
            &quot;job interview at a startup&quot;.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Enter a scenario…"
            placeholderTextColor={colors.textLight}
            value={text}
            onChangeText={setText}
            autoCapitalize="sentences"
            multiline
            maxLength={200}
          />
          <View style={styles.actions}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, !text.trim() && styles.saveBtnDisabled]}
              disabled={!text.trim()}
              onPress={handleSave}
            >
              <Text style={styles.saveText}>Start roleplay</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: 8,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 88,
    ...typography.body,
    color: colors.text,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  cancelText: {
    ...typography.label,
    color: colors.textMuted,
  },
  saveBtn: {
    flex: 1.4,
    minHeight: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: {
    ...typography.label,
    color: '#fff',
    fontWeight: '600',
  },
});
