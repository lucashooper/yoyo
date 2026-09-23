import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';
import { env } from '../config/env';
import type { SessionLog, UserProfile } from '../types';
import {
  appendSessionLog,
  getProfile,
  saveProfile,
  updateStreakAfterSession,
} from './storage';

export const isSupabaseConfigured = env.supabase.isConfigured;
const supabaseUrl = env.supabase.url;
const supabaseAnonKey = env.supabase.anonKey;

let client: SupabaseClient | null = null;
let authLifecycleBound = false;

function bindAuthLifecycle(supabase: SupabaseClient): void {
  if (authLifecycleBound) return;
  authLifecycleBound = true;

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void supabase.auth.startAutoRefresh();
    } else {
      void supabase.auth.stopAutoRefresh();
    }
  });
}

function getClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    bindAuthLifecycle(client);
  }
  return client;
}

export async function signInAnonymously(): Promise<{ userId: string; isMock: boolean }> {
  const supabase = getClient();
  if (!supabase) {
    const profile = await getProfile();
    return { userId: profile.id, isMock: true };
  }

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) {
    return { userId: existing.session.user.id, isMock: false };
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    const profile = await getProfile();
    return { userId: profile.id, isMock: true };
  }

  return { userId: data.user.id, isMock: false };
}

export async function signInWithMagicLink(email: string): Promise<{ ok: boolean; message: string }> {
  const supabase = getClient();
  if (!supabase) {
    return {
      ok: false,
      message: 'Supabase not configured. Using guest mode with local storage.',
    };
  }

  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: 'Check your email for the magic link.' };
}

export async function fetchStreak(userId: string): Promise<number> {
  const supabase = getClient();
  if (!supabase) {
    const profile = await getProfile();
    return profile.streak;
  }

  const { data } = await supabase
    .from('profiles')
    .select('streak')
    .eq('id', userId)
    .maybeSingle();

  if (data?.streak != null) return data.streak as number;

  const profile = await getProfile();
  return profile.streak;
}

export async function logSession(log: SessionLog, userId: string): Promise<UserProfile> {
  const supabase = getClient();

  if (!supabase) {
    await appendSessionLog(log);
    return updateStreakAfterSession();
  }

  const { error } = await supabase.from('session_logs').insert({
    id: log.id,
    user_id: userId,
    started_at: log.startedAt,
    ended_at: log.endedAt,
    language: log.language,
    scenario_title: log.scenarioTitle,
    transcript_length: log.transcriptLength,
  });

  if (error) {
    await appendSessionLog(log);
    return updateStreakAfterSession();
  }

  const profile = await updateStreakAfterSession();
  await supabase.from('profiles').upsert({
    id: userId,
    streak: profile.streak,
    last_session_date: profile.lastSessionDate,
    total_sessions: profile.totalSessions,
  });

  await saveProfile({ ...profile, id: userId });
  return profile;
}
