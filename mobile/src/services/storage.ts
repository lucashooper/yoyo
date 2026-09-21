import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  OnboardingData,
  PlanTier,
  Scenario,
  SessionLog,
  SupportedLanguage,
  UserProfile,
} from '../types';
import { DEFAULT_SCENARIOS } from '../types';
import { logger } from './logger';

const KEYS = {
  onboarding: '@nobi/onboarding',
  profile: '@nobi/profile',
  sessions: '@nobi/sessions',
  customScenarios: '@nobi/custom_scenarios',
  plan: '@nobi/plan',
} as const;

function defaultScenario(): Scenario {
  const base = DEFAULT_SCENARIOS[0]!;
  return { ...base, id: 'scenario_0' };
}

/** Normalize older onboarding payloads missing new fields */
export function normalizeOnboarding(raw: Partial<OnboardingData> & { language: SupportedLanguage }): OnboardingData {
  return {
    language: raw.language,
    scenario: raw.scenario ?? defaultScenario(),
    proficiency: raw.proficiency ?? 'beginner',
    motivation: raw.motivation ?? 'daily',
    plan: raw.plan ?? 'guest',
    completedAt: raw.completedAt ?? new Date().toISOString(),
  };
}

export async function getOnboarding(): Promise<OnboardingData | null> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.onboarding);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<OnboardingData> & { language?: SupportedLanguage };
    if (!parsed.language) return null;
    return normalizeOnboarding(parsed as Partial<OnboardingData> & { language: SupportedLanguage });
  } catch (err) {
    logger.error('storage', 'Failed to read onboarding', err);
    return null;
  }
}

export async function saveOnboarding(data: OnboardingData): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.onboarding, JSON.stringify(data));
    logger.info('storage', 'Onboarding saved', { language: data.language, plan: data.plan });
  } catch (err) {
    logger.error('storage', 'Failed to save onboarding', err);
    throw err;
  }
}

export async function clearOnboarding(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.onboarding);
}

export async function getPlan(): Promise<PlanTier> {
  const raw = await AsyncStorage.getItem(KEYS.plan);
  if (raw) return raw as PlanTier;
  const onboarding = await getOnboarding();
  return onboarding?.plan ?? 'guest';
}

export async function savePlan(plan: PlanTier): Promise<void> {
  await AsyncStorage.setItem(KEYS.plan, plan);
  const onboarding = await getOnboarding();
  if (onboarding) {
    await saveOnboarding({ ...onboarding, plan });
  }
}

export async function getProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.profile);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<UserProfile>;
      return {
        id: parsed.id ?? `guest_${Date.now()}`,
        streak: parsed.streak ?? 0,
        lastSessionDate: parsed.lastSessionDate ?? null,
        totalSessions: parsed.totalSessions ?? 0,
        xp: parsed.xp ?? 0,
        displayName: parsed.displayName ?? 'You',
      };
    }
  } catch (err) {
    logger.warn('storage', 'Corrupt profile, resetting', err);
  }

  const defaultProfile: UserProfile = {
    id: `guest_${Date.now()}`,
    streak: 0,
    lastSessionDate: null,
    totalSessions: 0,
    xp: 0,
    displayName: 'You',
  };
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(defaultProfile));
  return defaultProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function getSessionLogs(): Promise<SessionLog[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.sessions);
    return raw ? (JSON.parse(raw) as SessionLog[]) : [];
  } catch {
    return [];
  }
}

export async function appendSessionLog(log: SessionLog): Promise<void> {
  const logs = await getSessionLogs();
  logs.unshift(log);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(logs.slice(0, 50)));
}

export async function getCustomScenarios(): Promise<Scenario[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.customScenarios);
    return raw ? (JSON.parse(raw) as Scenario[]) : [];
  } catch {
    return [];
  }
}

export async function saveCustomScenario(scenario: Scenario): Promise<Scenario[]> {
  const list = await getCustomScenarios();
  list.unshift(scenario);
  const next = list.slice(0, 20);
  await AsyncStorage.setItem(KEYS.customScenarios, JSON.stringify(next));
  return next;
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function updateStreakAfterSession(xpGain = 25): Promise<UserProfile> {
  const profile = await getProfile();
  const today = todayDateString();

  if (profile.lastSessionDate === today) {
    profile.totalSessions += 1;
    profile.xp += xpGain;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    profile.streak = profile.lastSessionDate === yesterdayStr ? profile.streak + 1 : 1;
    profile.lastSessionDate = today;
    profile.totalSessions += 1;
    profile.xp += xpGain + (profile.streak > 1 ? 10 : 0);
  }

  await saveProfile(profile);
  return profile;
}
