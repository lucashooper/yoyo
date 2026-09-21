import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OnboardingData, SessionLog, UserProfile } from '../types';

const KEYS = {
  onboarding: '@nobi/onboarding',
  profile: '@nobi/profile',
  sessions: '@nobi/sessions',
} as const;

export async function getOnboarding(): Promise<OnboardingData | null> {
  const raw = await AsyncStorage.getItem(KEYS.onboarding);
  return raw ? (JSON.parse(raw) as OnboardingData) : null;
}

export async function saveOnboarding(data: OnboardingData): Promise<void> {
  await AsyncStorage.setItem(KEYS.onboarding, JSON.stringify(data));
}

export async function getProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(KEYS.profile);
  if (raw) return JSON.parse(raw) as UserProfile;

  const defaultProfile: UserProfile = {
    id: `guest_${Date.now()}`,
    streak: 0,
    lastSessionDate: null,
    totalSessions: 0,
  };
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(defaultProfile));
  return defaultProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export async function getSessionLogs(): Promise<SessionLog[]> {
  const raw = await AsyncStorage.getItem(KEYS.sessions);
  return raw ? (JSON.parse(raw) as SessionLog[]) : [];
}

export async function appendSessionLog(log: SessionLog): Promise<void> {
  const logs = await getSessionLogs();
  logs.unshift(log);
  await AsyncStorage.setItem(KEYS.sessions, JSON.stringify(logs.slice(0, 50)));
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function updateStreakAfterSession(): Promise<UserProfile> {
  const profile = await getProfile();
  const today = todayDateString();

  if (profile.lastSessionDate === today) {
    profile.totalSessions += 1;
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    profile.streak = profile.lastSessionDate === yesterdayStr ? profile.streak + 1 : 1;
    profile.lastSessionDate = today;
    profile.totalSessions += 1;
  }

  await saveProfile(profile);
  return profile;
}
