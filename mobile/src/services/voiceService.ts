import { env } from '../config/env';
import type { SupportedLanguage } from '../types';

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  description?: string;
}

interface VoicesResponse {
  voices: ElevenLabsVoice[];
}

/** Default mascot voice IDs per language — used when API fetch or matching fails. */
export const MASCOT_VOICES: Record<SupportedLanguage, { voiceId: string; name: string }> = {
  russian: { voiceId: '9eaLrh9YGK2eNwzX4htv', name: 'Nobi Russian' },
  spanish: { voiceId: 'pFZP5JQG7iQjIQuC4Bku', name: 'Nobi Spanish' },
  french: { voiceId: 'ThT5KcBeYPX3keUQqHPh', name: 'Nobi French' },
  english: { voiceId: '21m00Tcm4TlvDq8ikWAM', name: 'Nobi English' },
  japanese: { voiceId: 'jBpfuIE3acMC8SnF3Vh2', name: 'Nobi Japanese' },
  german: { voiceId: 'IKne3meq5aSn9XLyUdCD', name: 'Nobi German' },
};

const LANGUAGE_HINTS: Record<SupportedLanguage, string[]> = {
  russian: ['russian', 'ru', 'русский', 'russia'],
  spanish: ['spanish', 'es', 'español', 'castilian', 'mexican', 'latin'],
  french: ['french', 'fr', 'français', 'francais'],
  english: ['english', 'en', 'american', 'british', 'australian'],
  japanese: ['japanese', 'ja', '日本語', 'nihongo'],
  german: ['german', 'de', 'deutsch'],
};

let cachedVoices: ElevenLabsVoice[] | null = null;

export async function fetchVoices(): Promise<ElevenLabsVoice[]> {
  if (cachedVoices) return cachedVoices;

  if (!env.elevenLabs.hasApiKey) {
    cachedVoices = [];
    return cachedVoices;
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': env.elevenLabs.apiKey },
    });

    if (!response.ok) {
      cachedVoices = [];
      return cachedVoices;
    }

    const data = (await response.json()) as VoicesResponse;
    cachedVoices = data.voices ?? [];
    return cachedVoices;
  } catch {
    cachedVoices = [];
    return cachedVoices;
  }
}

function matchesLanguage(voice: ElevenLabsVoice, language: SupportedLanguage): boolean {
  const hints = LANGUAGE_HINTS[language];
  const haystack = [
    voice.name,
    voice.description ?? '',
    ...Object.entries(voice.labels ?? {}).flatMap(([k, v]) => [k, v]),
  ]
    .join(' ')
    .toLowerCase();

  return hints.some((hint) => haystack.includes(hint));
}

export async function getVoiceForLanguage(
  language: SupportedLanguage,
): Promise<{ voiceId: string; name: string }> {
  const voices = await fetchVoices();
  const match = voices.find((v) => matchesLanguage(v, language));

  if (match) {
    return { voiceId: match.voice_id, name: match.name };
  }

  const mascot = MASCOT_VOICES[language];
  if (mascot) return mascot;

  if (env.elevenLabs.hasVoiceId) {
    return { voiceId: env.elevenLabs.voiceId, name: 'Default voice' };
  }

  return MASCOT_VOICES.english;
}

export function clearVoiceCache(): void {
  cachedVoices = null;
}
