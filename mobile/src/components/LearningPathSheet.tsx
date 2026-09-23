import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
  FIRST_LESSON,
  GREETING_OBJECTIVES,
  type LearningObjective,
  type OnboardingData,
  type Scenario,
} from '../types';
import { PrimaryButton } from './PrimaryButton';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.92;

interface LearningPathSheetProps {
  visible: boolean;
  onboarding: OnboardingData;
  scenarios: Scenario[];
  freeSessionsRemaining: number;
  onClose: () => void;
  onStartScenario: (scenario: Scenario) => void;
  onStartRoleplay: () => void;
}

function buildObjectives(): LearningObjective[] {
  return GREETING_OBJECTIVES.map((obj, i) => ({
    ...obj,
    status: i === 0 ? 'active' : i < 3 ? 'upcoming' : 'locked',
  }));
}

export function LearningPathSheet({
  visible,
  onboarding,
  scenarios,
  freeSessionsRemaining,
  onClose,
  onStartScenario,
  onStartRoleplay,
}: LearningPathSheetProps) {
  const translateY = useSharedValue(SHEET_H);
  const objectives = buildObjectives();
  const langLabel = onboarding.language.charAt(0).toUpperCase() + onboarding.language.slice(1);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : SHEET_H, {
      duration: visible ? 280 : 220,
      easing: Easing.out(Easing.quad),
    });
  }, [translateY, visible]);

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const launchObjective = (obj: LearningObjective) => {
    if (obj.status === 'locked') return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const scenario: Scenario = {
      id: obj.id,
      title: obj.title,
      prompt: obj.prompt.replace('{{language}}', langLabel),
      isCustom: false,
      icon: '💬',
    };
    onStartScenario(scenario);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View style={[styles.sheet, sheetStyle]}>
          <SafeAreaView style={styles.safe} edges={['bottom']}>
            <Pressable style={styles.grabberWrap} onPress={onClose}>
              <View style={styles.grabber} />
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <View style={styles.headerBadge}>
                <Text style={styles.headerEmoji}>🎉</Text>
                <View>
                  <Text style={styles.headerStatus}>In progress</Text>
                  <Text style={styles.headerTitle}>{FIRST_LESSON.subtitle}</Text>
                </View>
              </View>

              <Text style={styles.meta}>
                {langLabel} · {onboarding.proficiency} · {freeSessionsRemaining} free sessions
              </Text>

              <Pressable style={styles.roleplayCard} onPress={onStartRoleplay}>
                <View style={styles.roleplayIcon}>
                  <Text style={styles.roleplayEmoji}>🎭</Text>
                </View>
                <View style={styles.roleplayBody}>
                  <Text style={styles.roleplayTitle}>Start roleplay</Text>
                  <Text style={styles.roleplayDesc}>Free-form AI practice — pick any scenario</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>

              <View style={styles.pathWrap}>
                <Svg width={24} height={objectives.length * 92} style={styles.pathSvg}>
                  <Path
                    d={objectives
                      .map((_, i) => {
                        const y = i * 92 + 24;
                        const x = i % 2 === 0 ? 8 : 16;
                        const nextY = (i + 1) * 92 + 24;
                        const nextX = (i + 1) % 2 === 0 ? 8 : 16;
                        if (i === objectives.length - 1) return '';
                        return `M ${x} ${y} Q 12 ${(y + nextY) / 2} ${nextX} ${nextY}`;
                      })
                      .join(' ')}
                    stroke={colors.pathLine}
                    strokeWidth={3}
                    fill="none"
                  />
                </Svg>

                <View style={styles.pathNodes}>
                  {objectives.map((obj, index) => {
                    const alignRight = index % 2 === 1;
                    return (
                      <Pressable
                        key={obj.id}
                        style={[styles.pathRow, alignRight && styles.pathRowRight]}
                        disabled={obj.status === 'locked'}
                        onPress={() => launchObjective(obj)}
                      >
                        <View
                          style={[
                            styles.node,
                            obj.status === 'active' && styles.nodeActive,
                            obj.status === 'locked' && styles.nodeLocked,
                          ]}
                        >
                          {obj.status === 'active' ? (
                            <View style={styles.nodeDot} />
                          ) : obj.status === 'locked' ? (
                            <Ionicons name="lock-closed" size={12} color={colors.textLight} />
                          ) : null}
                        </View>
                        <View style={[styles.objectiveCard, obj.status === 'locked' && styles.cardLocked]}>
                          <Text style={styles.objectiveLabel}>Objective</Text>
                          <Text style={styles.objectiveTitle}>{obj.title}</Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <Text style={styles.sectionLabel}>More scenarios</Text>
              {scenarios.slice(0, 4).map((scenario) => (
                <Pressable
                  key={scenario.id}
                  style={styles.scenarioRow}
                  onPress={() => {
                    onStartScenario(scenario);
                    onClose();
                  }}
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

            <View style={styles.footer}>
              <PrimaryButton title="Close" fullWidth size="md" onPress={onClose} />
            </View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
  sheet: {
    height: SHEET_H,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  safe: { flex: 1 },
  grabberWrap: { alignItems: 'center', paddingVertical: 10 },
  grabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 16 },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  headerEmoji: { fontSize: 28 },
  headerStatus: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.title,
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: 20,
    textTransform: 'capitalize',
  },
  roleplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    gap: 12,
  },
  roleplayIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleplayEmoji: { fontSize: 22 },
  roleplayBody: { flex: 1 },
  roleplayTitle: {
    ...typography.subtitle,
    color: colors.text,
  },
  roleplayDesc: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  pathWrap: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  pathSvg: {
    position: 'absolute',
    left: 4,
    top: 8,
  },
  pathNodes: { flex: 1, gap: 16, paddingLeft: 8 },
  pathRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 76,
  },
  pathRowRight: {
    flexDirection: 'row-reverse',
    paddingLeft: 32,
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.pathLine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeActive: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },
  nodeLocked: { backgroundColor: colors.surfaceMuted },
  nodeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  objectiveCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  cardLocked: { opacity: 0.55 },
  objectiveLabel: {
    ...typography.tiny,
    color: colors.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  objectiveTitle: {
    ...typography.subtitle,
    color: colors.text,
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
  footer: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
