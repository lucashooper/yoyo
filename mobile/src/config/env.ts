/**
 * Centralized env access for EXPO_PUBLIC_* vars.
 * Expo inlines these at Metro bundle time from .env / .env.local in mobile/.
 * Restart Metro with --clear after changing env files.
 */
function read(key: string): string {
  const value = process.env[key];
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

const apiKey = read('EXPO_PUBLIC_ELEVENLABS_API_KEY');
const agentId = read('EXPO_PUBLIC_ELEVENLABS_AGENT_ID');
const voiceId = read('EXPO_PUBLIC_ELEVENLABS_VOICE_ID');
const supabaseUrl = read('EXPO_PUBLIC_SUPABASE_URL');
const supabaseAnon = read('EXPO_PUBLIC_SUPABASE_ANON_KEY');

export const env = {
  elevenLabs: {
    apiKey,
    agentId,
    voiceId,
    hasApiKey: !isPlaceholder(apiKey),
    hasAgentId: !isPlaceholder(agentId),
    hasVoiceId: !isPlaceholder(voiceId),
    isAgentMode: !isPlaceholder(apiKey) && !isPlaceholder(agentId),
    isTtsMode: !isPlaceholder(apiKey) && isPlaceholder(agentId),
  },
  supabase: {
    url: supabaseUrl,
    anonKey: supabaseAnon,
    isConfigured: !isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseAnon),
  },
} as const;

/** Masked summary for dev logs — never prints full secrets */
export function getEnvDiagnostics(): Record<string, string | boolean> {
  return {
    elevenLabsApiKey: env.elevenLabs.hasApiKey
      ? `${apiKey.slice(0, 6)}…${apiKey.slice(-4)}`
      : 'missing',
    elevenLabsAgentId: env.elevenLabs.hasAgentId ? `${agentId.slice(0, 8)}…` : 'missing',
    elevenLabsVoiceId: env.elevenLabs.hasVoiceId ? voiceId : 'missing',
    agentMode: env.elevenLabs.isAgentMode,
    ttsMode: env.elevenLabs.isTtsMode,
    supabaseConfigured: env.supabase.isConfigured,
    hint: 'Place keys in mobile/.env.local and restart: npm run start:tunnel -- --clear',
  };
}
