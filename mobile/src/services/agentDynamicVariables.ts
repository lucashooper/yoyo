import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../types';

const LANGUAGE_ISO: Record<SupportedLanguage, string> = {
  spanish: 'es',
  french: 'fr',
  english: 'en',
  japanese: 'ja',
  german: 'de',
  russian: 'ru',
};

function languageLabel(lang: SupportedLanguage): string {
  return LANGUAGE_OPTIONS.find((l) => l.value === lang)?.label ?? lang;
}

/** Which ElevenLabs Security overrides the agent allows */
export type InitiationOverrideMode =
  | 'language-and-voice'
  | 'language-only'
  | 'voice-only'
  | 'none';

export interface AgentInitiationPayload {
  type: 'conversation_initiation_client_data';
  dynamic_variables: Record<string, string>;
  conversation_config_override?: {
    agent?: { language: string };
    tts?: { voice_id: string };
  };
}

/**
 * Build conversation_initiation_client_data for ElevenLabs ConvAI.
 * Language/voice overrides require Agent → Security permissions.
 */
export function buildAgentInitiationPayload(
  language: SupportedLanguage,
  scenarioPrompt: string,
  voiceId: string,
  overrideMode: InitiationOverrideMode = 'none',
): AgentInitiationPayload {
  const label = languageLabel(language);

  const payload: AgentInitiationPayload = {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      language: label,
      scenario: scenarioPrompt,
    },
  };

  if (overrideMode === 'none') return payload;

  payload.conversation_config_override = {};

  if (overrideMode === 'language-only' || overrideMode === 'language-and-voice') {
    payload.conversation_config_override.agent = {
      language: LANGUAGE_ISO[language],
    };
  }

  if (overrideMode === 'voice-only' || overrideMode === 'language-and-voice') {
    payload.conversation_config_override.tts = { voice_id: voiceId };
  }

  return payload;
}
