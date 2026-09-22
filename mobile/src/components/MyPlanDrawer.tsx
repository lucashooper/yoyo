import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import type { OnboardingData, Scenario } from '../types';

interface MyPlanDrawerProps {
  onboarding: OnboardingData;
  scenarios: Scenario[];
  freeSessionsRemaining: number;
  onStartScenario: (scenario: Scenario) => void;
}

const COLLAPSED = 52;
const EXPANDED = 340;

export function MyPlanDrawer({
  onboarding,
  scenarios,
  freeSessionsRemaining,
  onStartScenario,
}: MyPlanDrawerProps) {
  const [expanded, setExpanded] = useState(false);
  const height = useSharedValue(COLLAPSED);

  const toggle = (open: boolean) => {
    setExpanded(open);
    height.value = withSpring(open ? EXPANDED : COLLAPSED, { damping: 18, stiffness: 120 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      const next = Math.max(COLLAPSED, Math.min(EXPANDED, EXPANDED - e.translationY));
      height.value = next;
    })
    .onEnd((e) => {
      const shouldExpand = e.translationY < -40 || height.value > EXPANDED * 0.45;
      height.value = withSpring(shouldExpand ? EXPANDED : COLLAPSED, {
        damping: 18,
        stiffness: 120,
      });
      runOnJS(setExpanded)(shouldExpand);
    });

  const drawerStyle = useAnimatedStyle(() => ({ height: height.value }));

  const langLabel = onboarding.language.charAt(0).toUpperCase() + onboarding.language.slice(1);

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.drawer, drawerStyle]}>
        <Pressable style={styles.handle} onPress={() => toggle(!expanded)}>
          <Text style={styles.chevron}>^</Text>
          <Text style={styles.handleText}>My plan</Text>
        </Pressable>

        {expanded && (
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <Text style={styles.planTitle}>
              {langLabel} · {onboarding.proficiency}
            </Text>
            <Text style={styles.planMeta}>
              Goal: {onboarding.motivation} · {freeSessionsRemaining} free sessions left
            </Text>

            <Text style={styles.sectionLabel}>Upcoming scenarios</Text>
            {scenarios.slice(0, 6).map((scenario) => (
              <Pressable
                key={scenario.id}
                style={styles.scenarioRow}
                onPress={() => onStartScenario(scenario)}
              >
                <Text style={styles.scenarioIcon}>{scenario.icon ?? '💬'}</Text>
                <View style={styles.scenarioBody}>
                  <Text style={styles.scenarioTitle}>{scenario.title}</Text>
                  <Text style={styles.scenarioPrompt} numberOfLines={1}>
                    {scenario.prompt}
                  </Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  drawer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  handle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 8,
  },
  chevron: {
    color: colors.pingoBlue,
    fontSize: 14,
    lineHeight: 14,
  },
  handleText: {
    ...typography.label,
    color: colors.pingoBlue,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  planTitle: {
    ...typography.subtitle,
    color: colors.text,
    marginBottom: 4,
  },
  planMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: 10,
  },
  scenarioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  scenarioIcon: { fontSize: 20 },
  scenarioBody: { flex: 1 },
  scenarioTitle: {
    ...typography.label,
    color: colors.text,
  },
  scenarioPrompt: {
    ...typography.tiny,
    color: colors.textMuted,
    marginTop: 2,
  },
});
