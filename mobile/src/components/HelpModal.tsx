import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface HelpModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HelpModal({ visible, onClose }: HelpModalProps) {
  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>How Nobi works</Text>
          <Text style={styles.body}>
            Just speak naturally — Nobi listens continuously. Pause when you're done talking and
            Nobi will respond. Pull up the transcript anytime for review.
          </Text>
          <Text style={styles.tip}>Tip: Use headphones for the best experience.</Text>
          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>Got it</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
  },
  title: {
    ...typography.title,
    color: colors.text,
    marginBottom: 12,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: 12,
  },
  tip: {
    ...typography.caption,
    color: colors.primary,
    marginBottom: 20,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: {
    ...typography.label,
    color: '#fff',
    fontSize: 16,
  },
});
