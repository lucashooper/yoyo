/**
 * Centralized env access for EXPO_PUBLIC_* vars.
 * Metro only inlines EXPO_PUBLIC_* when accessed via static dot-notation —
 * dynamic lookups like process.env[key] are NOT replaced at bundle time.
 * Restart Metro with --clear after changing .env.local.
 */

function trim(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isPlaceholder(value: string): boolean {
  if (!value) return true;
  const lower = value.toLowerCase();
  return (
    lower.includes('your_') ||
    lower.includes('xxx') ||
    lower === 'sk_...' ||
    lower.startsWith('eyj...')
  );
}

// Static dot-notation — required for Metro inlining from .env.local
const EXPO_PUBLIC_ELEVENLABS_API_KEY = trim(process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY);
const EXPO_PUBLIC_ELEVENLABS_AGENT_ID = trim(process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID);
const EXPO_PUBLIC_ELEVENLABS_VOICE_ID = trim(process.env.EXPO_PUBLIC_ELEVENLABS_VOICE_ID);
const EXPO_PUBLIC_SUPABASE_URL = trim(process.env.EXPO_PUBLIC_SUPABASE_URL);
const EXPO_PUBLIC_SUPABASE_ANON_KEY = trim(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const hasApiKey = Boolean(EXPO_PUBLIC_ELEVENLABS_API_KEY) && !isPlaceholder(EXPO_PUBLIC_ELEVENLABS_API_KEY);
const hasAgentId = Boolean(EXPO_PUBLIC_ELEVENLABS_AGENT_ID) && !isPlaceholder(EXPO_PUBLIC_ELEVENLABS_AGENT_ID);
const hasVoiceId = Boolean(EXPO_PUBLIC_ELEVENLABS_VOICE_ID) && !isPlaceholder(EXPO_PUBLIC_ELEVENLABS_VOICE_ID);
const hasSupabaseUrl = Boolean(EXPO_PUBLIC_SUPABASE_URL) && !isPlaceholder(EXPO_PUBLIC_SUPABASE_URL);
const hasSupabaseAnon = Boolean(EXPO_PUBLIC_SUPABASE_ANON_KEY) && !isPlaceholder(EXPO_PUBLIC_SUPABASE_ANON_KEY);

export const env = {
  elevenLabs: {
    apiKey: EXPO_PUBLIC_ELEVENLABS_API_KEY,
    agentId: EXPO_PUBLIC_ELEVENLABS_AGENT_ID,
    voiceId: EXPO_PUBLIC_ELEVENLABS_VOICE_ID,
    hasApiKey,
    hasAgentId,
    hasVoiceId,
    isAgentMode: hasApiKey && hasAgentId,
    isTtsMode: hasApiKey && !hasAgentId,
  },
  supabase: {
    url: EXPO_PUBLIC_SUPABASE_URL,
    anonKey: EXPO_PUBLIC_SUPABASE_ANON_KEY,
    isConfigured: hasSupabaseUrl && hasSupabaseAnon,
  },
} as const;

/** Masked summary for dev logs — never prints full secrets */
export function getEnvDiagnostics(): Record<string, string | boolean> {
  return {
    elevenLabsApiKey: hasApiKey
      ? `${EXPO_PUBLIC_ELEVENLABS_API_KEY.slice(0, 6)}…${EXPO_PUBLIC_ELEVENLABS_API_KEY.slice(-4)}`
      : 'missing',
    elevenLabsAgentId: hasAgentId
      ? `${EXPO_PUBLIC_ELEVENLABS_AGENT_ID.slice(0, 8)}…`
      : 'missing',
    elevenLabsVoiceId: hasVoiceId ? EXPO_PUBLIC_ELEVENLABS_VOICE_ID : 'missing',
    agentMode: hasApiKey && hasAgentId,
    ttsMode: hasApiKey && !hasAgentId,
    supabaseConfigured: hasSupabaseUrl && hasSupabaseAnon,
    hint: 'Place keys in mobile/.env.local and restart: npm run start:tunnel -- --clear',
  };
}
