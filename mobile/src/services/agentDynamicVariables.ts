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

export interface AgentInitiationPayload {
  type: 'conversation_initiation_client_data';
  dynamic_variables: Record<string, string>;
  conversation_config_override: {
    agent: { language: string };
    tts: { voice_id: string };
  };
}

/**
 * Build conversation_initiation_client_data for ElevenLabs ConvAI.
 * Requires agent Security → allow language + voice overrides in dashboard.
 */
export function buildAgentInitiationPayload(
  language: SupportedLanguage,
  scenarioPrompt: string,
  voiceId: string,
): AgentInitiationPayload {
  const label = languageLabel(language);

  return {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      language: label,
      scenario: scenarioPrompt,
    },
    conversation_config_override: {
      agent: {
        language: LANGUAGE_ISO[language],
      },
      tts: {
        voice_id: voiceId,
      },
    },
  };
}
