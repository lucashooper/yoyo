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

const COLLAPSED = 44;
const EXPANDED = 300;

export function TranscriptDrawer({ entries }: TranscriptDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const height = useSharedValue(COLLAPSED);

  const toggle = (open: boolean) => {
    setExpanded(open);
    height.value = withSpring(open ? EXPANDED : COLLAPSED, { damping: 20, stiffness: 180 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = Math.max(COLLAPSED, Math.min(EXPANDED, EXPANDED - e.translationY));
      height.value = next;
    })
    .onEnd((e) => {
      const shouldExpand = e.translationY < -36 || height.value > EXPANDED * 0.5;
      height.value = withSpring(shouldExpand ? EXPANDED : COLLAPSED, {
        damping: 20,
        stiffness: 180,
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
          <Text style={styles.handleText}>^ Swipe up for transcript</Text>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(249, 250, 252, 0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  handle: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 6,
  },
  handleText: {
    fontSize: 12,
    letterSpacing: 0.3,
    color: '#6B7280',
    fontWeight: '500',
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
    color: '#6B7280',
    fontSize: 12,
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
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingTop: 12,
    letterSpacing: 0.2,
  },
  bubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '88%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(108, 92, 231, 0.12)',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
  },
  bubbleText: {
    ...typography.body,
    color: colors.text,
    fontSize: 15,
  },
  translation: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
});
