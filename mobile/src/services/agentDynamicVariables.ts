import { LANGUAGE_OPTIONS, type SupportedLanguage } from '../types';

/** ISO 639-1 codes for ElevenLabs agent language override */
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

/**
 * Build dynamic_variables for conversation_initiation_client_data.
 * Variable names must match the agent prompt exactly (case-sensitive).
 *
 * Your ElevenLabs agent requires `_language_` — see agent prompt placeholders.
 */
export function buildAgentInitiationPayload(
  language: SupportedLanguage,
  scenarioPrompt: string,
): {
  type: 'conversation_initiation_client_data';
  dynamic_variables: Record<string, string>;
  conversation_config_override: {
    agent: { language: string };
  };
} {
  const label = languageLabel(language);

  return {
    type: 'conversation_initiation_client_data',
    dynamic_variables: {
      // Required by your agent prompt ({{ _language_ }})
      _language_: label,
      // Common aliases — harmless if unused by the agent
      language: label,
      scenario: scenarioPrompt,
    },
    conversation_config_override: {
      agent: {
        language: LANGUAGE_ISO[language],
      },
    },
  };
}
