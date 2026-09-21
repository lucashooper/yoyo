import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { TranscriptEntry } from '../types';

interface TranscriptDrawerProps {
  entries: TranscriptEntry[];
}

const COLLAPSED = 56;
const EXPANDED = 320;

export function TranscriptDrawer({ entries }: TranscriptDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const height = useSharedValue(COLLAPSED);

  const toggle = (open: boolean) => {
    setExpanded(open);
    height.value = withSpring(open ? EXPANDED : COLLAPSED, { damping: 18, stiffness: 160 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = Math.max(COLLAPSED, Math.min(EXPANDED, EXPANDED - e.translationY));
      height.value = next;
    })
    .onEnd((e) => {
      const shouldExpand = e.translationY < -40 || height.value > EXPANDED * 0.55;
      height.value = withSpring(shouldExpand ? EXPANDED : COLLAPSED, {
        damping: 18,
        stiffness: 160,
      });
      runOnJS(setExpanded)(shouldExpand);
    });

  const drawerStyle = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.drawer, drawerStyle]}>
        <Pressable style={styles.handle} onPress={() => toggle(!expanded)}>
          <View style={styles.grabber} />
          <Text style={styles.handleText}>^ Transcript</Text>
        </Pressable>

        {expanded && (
          <View style={styles.toolbar}>
            <Text style={styles.toolbarLabel}>Translation</Text>
            <Switch
              value={showTranslation}
              onValueChange={setShowTranslation}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              thumbColor={showTranslation ? colors.primary : colors.surface}
            />
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {entries.length === 0 ? (
            <Text style={styles.empty}>Your conversation will appear here.</Text>
          ) : (
            entries.map((entry) => (
              <View
                key={entry.id}
                style={[
                  styles.bubble,
                  entry.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={styles.bubbleText}>{entry.text}</Text>
                {showTranslation && entry.translation && (
                  <Text style={styles.translation}>{entry.translation}</Text>
                )}
              </View>
            ))
          )}
        </ScrollView>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  handle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: 6,
  },
  handleText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  toolbarLabel: {
    ...typography.label,
    color: colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  empty: {
    ...typography.caption,
    color: colors.textLight,
    textAlign: 'center',
    paddingTop: 12,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primaryLight + '33',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
  },
  bubbleText: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
  },
  translation: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
});
